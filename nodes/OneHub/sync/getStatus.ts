import {
	type IExecuteFunctions,
	type IDataObject,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
} from 'n8n-workflow';

export async function executeSyncGetStatus(
	context: IExecuteFunctions,
	itemIndex: number,
	chatId: string,
	fileBaseUrl: string,
): Promise<IDataObject | IDataObject[] | undefined> {
	const jobId = context.getNodeParameter('jobId', itemIndex) as string;

	const requestOptions: IHttpRequestOptions = {
		method: 'GET' as IHttpRequestMethods,
		url: `/api/v1/extern/upsert/${chatId}/jobs/${jobId}`,
		baseURL: fileBaseUrl,
	};

	return await context.helpers.httpRequestWithAuthentication.call(
		context,
		'oneHubApi',
		requestOptions,
	);
}
