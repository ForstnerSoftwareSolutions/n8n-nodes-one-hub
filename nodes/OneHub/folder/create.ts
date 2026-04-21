import {
	NodeOperationError,
	type IExecuteFunctions,
	type IDataObject,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
} from 'n8n-workflow';

export async function executeFolderCreate(
	context: IExecuteFunctions,
	itemIndex: number,
	chatId: string,
	fileBaseUrl: string,
): Promise<IDataObject | IDataObject[] | undefined> {
	const path = context.getNodeParameter('path', itemIndex) as string;

	if (!path) {
		throw new NodeOperationError(context.getNode(), 'Path is required to create a folder.', {
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

	return await context.helpers.httpRequestWithAuthentication.call(
		context,
		'oneHubApi',
		requestOptions,
	);
}
