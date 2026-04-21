import {
	type IExecuteFunctions,
	type IDataObject,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
} from 'n8n-workflow';

export async function executeSyncTrigger(
	context: IExecuteFunctions,
	chatId: string,
	fileBaseUrl: string,
): Promise<IDataObject | IDataObject[] | undefined> {
	const requestOptions: IHttpRequestOptions = {
		method: 'POST' as IHttpRequestMethods,
		url: `/api/v1/extern/upsert/${chatId}`,
		baseURL: fileBaseUrl,
	};

	return await context.helpers.httpRequestWithAuthentication.call(
		context,
		'oneHubApi',
		requestOptions,
	);
}
