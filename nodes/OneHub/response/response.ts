import {
	NodeOperationError,
	type IExecuteFunctions,
	type IDataObject,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
} from 'n8n-workflow';

export async function executeResponse(
	context: IExecuteFunctions,
	itemIndex: number,
	chatId: string,
	chatBaseUrl: string,
): Promise<IDataObject | IDataObject[] | undefined> {
	const input = context.getNodeParameter('input', itemIndex) as string;
	const additionalFields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

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

	return await context.helpers.httpRequestWithAuthentication.call(
		context,
		'oneHubApi',
		requestOptions,
	);
}

export function assertResponseOperation(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): void {
	if (operation !== 'send') {
		throw new NodeOperationError(
			context.getNode(),
			`Unsupported response operation: "${operation}"`,
			{ itemIndex },
		);
	}
}
