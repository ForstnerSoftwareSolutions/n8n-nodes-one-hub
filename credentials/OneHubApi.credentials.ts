import type {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OneHubApi implements ICredentialType {
	name = 'oneHubApi';

	displayName = 'One-Hub API';

	icon: ICredentialType['icon'] = {
		light: 'file:../icons/oneHub.svg',
		dark: 'file:../icons/oneHub.dark.svg',
	};

	// Link to your community node's README
	documentationUrl = 'https://github.com/one-hub/n8n-nodes-one-hub#credentials';

	test: ICredentialType['test'] = {
		request: {
			baseURL: '={{$credentials.baseUrlMode === "onPremise" ? $credentials.fileBaseUrl : "https://file.api.one-hub.at"}}',
			url: '/api/v1/extern/auth/test',
			method: 'GET',
		},
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Deployment Type',
			name: 'baseUrlMode',
			type: 'options',
			default: 'cloud',
			options: [
				{
					name: 'Cloud (Default URLs)',
					value: 'cloud',
				},
				{
					name: 'On-Premise (Custom URLs)',
					value: 'onPremise',
				},
			],
			description: 'Choose cloud with default URLs or provide your own base URLs for on-premise deployments.',
		},
		{
			displayName: 'Chat API Base URL',
			name: 'chatBaseUrl',
			type: 'string',
			default: 'https://chat.api.one-hub.at',
			required: true,
			displayOptions: {
				show: {
					baseUrlMode: ['onPremise'],
				},
			},
			description: 'Base URL for the chat service (used for responses and chat operations).',
		},
		{
			displayName: 'File API Base URL',
			name: 'fileBaseUrl',
			type: 'string',
			default: 'https://file.api.one-hub.at',
			required: true,
			displayOptions: {
				show: {
					baseUrlMode: ['onPremise'],
				},
			},
			description: 'Base URL for the file service (used for uploads, folders, and sync operations).',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'API key token. You can provide it with or without the "Bearer " prefix.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization:
					'={{$credentials.apiKey.trim().toLowerCase().startsWith("bearer ") ? $credentials.apiKey.trim() : "Bearer " + $credentials.apiKey.trim()}}',
			},
		},
	};
}
