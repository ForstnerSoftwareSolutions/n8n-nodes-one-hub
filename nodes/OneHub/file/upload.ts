import {
	NodeOperationError,
	type IExecuteFunctions,
	type IDataObject,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';

export async function executeFileUpload(
	context: IExecuteFunctions,
	itemIndex: number,
	chatId: string,
	fileBaseUrl: string,
	item: INodeExecutionData,
): Promise<IDataObject | IDataObject[] | undefined> {
	const binaryPropertyName = context.getNodeParameter('binaryPropertyName', itemIndex) as string;
	const path = context.getNodeParameter('path', itemIndex, '') as string;
	const fileNameOverride = context.getNodeParameter('fileName', itemIndex, '') as string;

	if (!item.binary || !item.binary[binaryPropertyName]) {
		throw new NodeOperationError(
			context.getNode(),
			`Binary property "${binaryPropertyName}" is missing on input item.`,
			{ itemIndex },
		);
	}

	const binaryData = item.binary[binaryPropertyName];
	const binaryBuffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	const fileName = fileNameOverride || binaryData.fileName || 'file';

	const formData = new FormData();
	formData.append('ChatId', chatId);
	formData.append('FileName', fileName);
	formData.append(
		'File',
		new Blob([binaryBuffer], {
			type: binaryData.mimeType || 'application/octet-stream',
		}),
		fileName,
	);

	if (path) {
		formData.append('Path', path);
	}

	const requestOptions: IHttpRequestOptions = {
		method: 'POST' as IHttpRequestMethods,
		url: '/api/v1/extern/file',
		baseURL: fileBaseUrl,
		body: formData,
	};

	return await context.helpers.httpRequestWithAuthentication.call(
		context,
		'oneHubApi',
		requestOptions,
	);
}
