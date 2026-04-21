import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type IDataObject,
	type IHttpRequestOptions,
	type IHttpRequestMethods,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

declare const global: {
	FormData?: new () => {
		append: (name: string, value: unknown, fileName?: string) => void;
	};
	Blob?: new (parts: unknown[], options?: { type?: string }) => unknown;
};

export class OneHub implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'One-Hub',
		name: 'oneHub',
		icon: { light: 'file:oneHub.svg', dark: 'file:oneHub.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the One-Hub API',
		defaults: {
			name: 'One-Hub',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'oneHubApi',
				required: true,
				testedBy: {
					request: {
						baseURL: '={{$credentials.baseUrlMode === "onPremise" ? $credentials.chatBaseUrl : "https://chat.api.one-hub.at"}}',
						url: '/api/v1/extern/responses',
						method: 'POST',
						body: {
							chatId: '00000000-0000-0000-0000-000000000000',
							input: 'credential-test',
						},
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Response', value: 'response' },
					{ name: 'File', value: 'file' },
					{ name: 'Sync', value: 'sync' },
					{ name: 'Folder', value: 'folder' },
				],
				default: 'response',
				description: 'Choose which One-Hub endpoint to call',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['response'] } },
				options: [
					{
						name: 'Send Question',
						value: 'send',
						action: 'Send question to AI',
						description: 'Send a prompt to the AI and receive a non-streaming response with sources',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['file'] } },
				options: [
					{ name: 'Upload', value: 'upload', action: 'Upload file', description: 'Upload a file for a chat' },
					{ name: 'Delete', value: 'delete', action: 'Delete file', description: 'Delete a file from chat storage' },
				],
				default: 'upload',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sync'] } },
				options: [
					{ name: 'Trigger Sync', value: 'trigger', action: 'Trigger sync', description: 'Sync all files and connectors of a chat and create a summary' },
					{ name: 'Get Job Status', value: 'getStatus', action: 'Get sync job status', description: 'Retrieve the status of a previously enqueued sync job' },
				],
				default: 'trigger',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['folder'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create folder', description: 'Create a new folder in chat storage' },
					{ name: 'Delete', value: 'delete', action: 'Delete folder', description: 'Delete a folder from chat storage' },
				],
				default: 'create',
			},
			{
				displayName: 'Chat ID',
				name: 'chatId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['response', 'file', 'sync', 'folder'] } },
				default: '',
				description: 'Chat GUID used by the One-Hub API',
			},
			{
				displayName: 'Input',
				name: 'input',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['response'], operation: ['send'] } },
				default: '',
				description: 'Prompt or question to send to the AI',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalFields',
				type: 'collection',
				displayOptions: { show: { resource: ['response'], operation: ['send'] } },
				default: {},
				description: 'Optional overrides for the AI response endpoint',
				options: [
					{ displayName: 'Max Output Tokens', name: 'maxOutputTokens', type: 'number', typeOptions: { minValue: 16 }, default: 2000 },
					{ displayName: 'Session ID', name: 'sessionId', type: 'string', default: '' },
					{ displayName: 'System Prompt', name: 'systemPrompt', type: 'string', default: '' },
					{ displayName: 'Temperature', name: 'temperature', type: 'number', typeOptions: { minValue: 0, maxValue: 2 }, default: 0.7 },
					{ displayName: 'Top P', name: 'topP', type: 'number', typeOptions: { minValue: 0, maxValue: 1 }, default: 0.9 },
				],
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['file'], operation: ['upload'] } },
				default: 'file',
				description: 'Name of the input binary property that contains the file to upload (default: file)',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				displayOptions: { show: { resource: ['file', 'folder'] } },
				default: '',
				description: 'Folder path inside the chat storage. Leave empty to use the root.',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				displayOptions: { show: { resource: ['file'], operation: ['upload'] } },
				default: '',
				description: 'Optional file name override. Defaults to the incoming binary filename.',
			},
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['sync'], operation: ['getStatus'] } },
				default: '',
				description: 'Sync job ID returned by the trigger endpoint',
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('oneHubApi');

		const resolveBaseUrls = () => {
			const useCloud = credentials.baseUrlMode !== 'onPremise';
			const chatBaseUrl = useCloud
				? 'https://chat.api.one-hub.at'
				: (credentials.chatBaseUrl as string | undefined);
			const fileBaseUrl = useCloud
				? 'https://file.api.one-hub.at'
				: (credentials.fileBaseUrl as string | undefined);

			if (!chatBaseUrl) {
				throw new NodeOperationError(this.getNode(), 'Chat API base URL is missing.');
			}

			if (!fileBaseUrl) {
				throw new NodeOperationError(this.getNode(), 'File API base URL is missing.');
			}

			return { chatBaseUrl, fileBaseUrl };
		};

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const chatId = this.getNodeParameter('chatId', itemIndex) as string;
				const { chatBaseUrl, fileBaseUrl } = resolveBaseUrls();

				let responseData: IDataObject | IDataObject[] | undefined;

				if (resource === 'response' && operation === 'send') {
					const input = this.getNodeParameter('input', itemIndex) as string;
					const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

					const body: IDataObject = {
						chatId,
						input,
						...additionalFields,
					};

					const requestOptions: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/v1/extern/responses',
						baseURL: chatBaseUrl,
						body,
						json: true,
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneHubApi',
						requestOptions,
					);
				} else if (resource === 'file' && operation === 'upload') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
					const path = this.getNodeParameter('path', itemIndex, '') as string;
					const fileNameOverride = this.getNodeParameter('fileName', itemIndex, '') as string;

					const item = items[itemIndex];
					if (!item.binary || !item.binary[binaryPropertyName]) {
						throw new NodeOperationError(
							this.getNode(),
							`Binary property "${binaryPropertyName}" is missing on input item.`,
							{ itemIndex },
						);
					}

					const binaryData = item.binary[binaryPropertyName];
					const binaryBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
					const fileName = fileNameOverride || binaryData.fileName || 'file';

					if (!global.FormData || !global.Blob) {
						throw new NodeOperationError(this.getNode(), 'FormData/Blob are not available in this runtime.', {
							itemIndex,
						});
					}

					const formData = new global.FormData();
					formData.append('ChatId', chatId);
					formData.append('FileName', fileName);

					const filePart = new global.Blob([binaryBuffer], {
						type: binaryData.mimeType || 'application/octet-stream',
					});
					formData.append('File', filePart, fileName);

					if (path) {
						formData.append('Path', path);
					}

					const requestOptions: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/v1/extern/file',
						baseURL: fileBaseUrl,
						body: formData as unknown as IHttpRequestOptions['body'],
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneHubApi',
						requestOptions,
					);
				} else if (resource === 'file' && operation === 'delete') {
					const path = this.getNodeParameter('path', itemIndex) as string;

					if (!path) {
						throw new NodeOperationError(this.getNode(), 'Path is required to delete a file.', {
							itemIndex,
						});
					}

					const body: IDataObject = { chatId, path };

					const requestOptions: IHttpRequestOptions = {
						method: 'DELETE' as IHttpRequestMethods,
						url: '/api/v1/extern/file',
						baseURL: fileBaseUrl,
						body,
						json: true,
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneHubApi',
						requestOptions,
					);
				} else if (resource === 'sync' && operation === 'trigger') {
					const requestOptions: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: `/api/v1/extern/upsert/${chatId}`,
						baseURL: fileBaseUrl,
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneHubApi',
						requestOptions,
					);
				} else if (resource === 'sync' && operation === 'getStatus') {
					const jobId = this.getNodeParameter('jobId', itemIndex) as string;

					const requestOptions: IHttpRequestOptions = {
						method: 'GET' as IHttpRequestMethods,
						url: `/api/v1/extern/upsert/${chatId}/jobs/${jobId}`,
						baseURL: fileBaseUrl,
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneHubApi',
						requestOptions,
					);
				} else if (resource === 'folder' && operation === 'create') {
					const path = this.getNodeParameter('path', itemIndex) as string;

					if (!path) {
						throw new NodeOperationError(this.getNode(), 'Path is required to create a folder.', {
							itemIndex,
						});
					}

					const body: IDataObject = { chatId, path };
					const requestOptions: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/v1/extern/folder',
						baseURL: fileBaseUrl,
						body,
						json: true,
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneHubApi',
						requestOptions,
					);
				} else if (resource === 'folder' && operation === 'delete') {
					const path = this.getNodeParameter('path', itemIndex) as string;

					if (!path) {
						throw new NodeOperationError(this.getNode(), 'Path is required to delete a folder.', {
							itemIndex,
						});
					}

					const body: IDataObject = { chatId, path };
					const requestOptions: IHttpRequestOptions = {
						method: 'DELETE' as IHttpRequestMethods,
						url: '/api/v1/extern/folder',
						baseURL: fileBaseUrl,
						body,
						json: true,
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneHubApi',
						requestOptions,
					);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported combination: resource "${resource}" with operation "${operation}"`,
						{ itemIndex },
					);
				}


				const normalized = Array.isArray(responseData) ? responseData : [responseData ?? {}];
				returnData.push(...this.helpers.returnJsonArray(normalized));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: itemIndex,
					});
					continue;
				}

				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
