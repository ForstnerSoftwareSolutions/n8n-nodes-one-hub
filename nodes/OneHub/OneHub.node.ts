import {
NodeConnectionTypes,
NodeOperationError,
type IExecuteFunctions,
type IDataObject,
type INodeExecutionData,
type INodeType,
type INodeTypeDescription,
} from 'n8n-workflow';
import { executeFileDelete } from './file/delete';
import { executeFileUpload } from './file/upload';
import { executeFolderCreate } from './folder/create';
import { executeFolderDelete } from './folder/delete';
import { assertResponseOperation, executeResponse } from './response/response';
import { executeSyncGetStatus } from './sync/getStatus';
import { executeSyncTrigger } from './sync/trigger';

export class OneHub implements INodeType {
description: INodeTypeDescription = {
displayName: 'One-Hub',
name: 'oneHub',
icon: { light: 'file:../../icons/oneHub.svg', dark: 'file:../../icons/oneHub.dark.svg' },
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
const item = items[itemIndex];
const resource = this.getNodeParameter('resource', itemIndex) as string;
const operation = this.getNodeParameter('operation', itemIndex) as string;
const chatId = this.getNodeParameter('chatId', itemIndex) as string;
const { chatBaseUrl, fileBaseUrl } = resolveBaseUrls();

let responseData: IDataObject | IDataObject[] | undefined;

if (resource === 'response') {
assertResponseOperation(this, itemIndex, operation);
responseData = await executeResponse(this, itemIndex, chatId, chatBaseUrl);
} else if (resource === 'file') {
if (operation === 'upload') {
responseData = await executeFileUpload(this, itemIndex, chatId, fileBaseUrl, item);
} else if (operation === 'delete') {
responseData = await executeFileDelete(this, itemIndex, chatId, fileBaseUrl);
} else {
throw new NodeOperationError(this.getNode(), `Unsupported file operation: "${operation}"`, {
itemIndex,
});
}
} else if (resource === 'sync') {
if (operation === 'trigger') {
responseData = await executeSyncTrigger(this, chatId, fileBaseUrl);
} else if (operation === 'getStatus') {
responseData = await executeSyncGetStatus(this, itemIndex, chatId, fileBaseUrl);
} else {
throw new NodeOperationError(this.getNode(), `Unsupported sync operation: "${operation}"`, {
itemIndex,
});
}
} else if (resource === 'folder') {
if (operation === 'create') {
responseData = await executeFolderCreate(this, itemIndex, chatId, fileBaseUrl);
} else if (operation === 'delete') {
responseData = await executeFolderDelete(this, itemIndex, chatId, fileBaseUrl);
} else {
throw new NodeOperationError(this.getNode(), `Unsupported folder operation: "${operation}"`, {
itemIndex,
});
}
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

return [returnData];
}
}
