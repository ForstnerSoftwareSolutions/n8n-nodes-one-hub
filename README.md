# n8n-nodes-one-hub

This is an n8n community node for One-Hub, a trusted enterprise knowledge interface that connects systems like Jira, SharePoint, Confluence, and files to deliver precise, source-backed answers in seconds.

One-Hub is designed for secure company use with GDPR-compliant operation, Austrian hosting, and on-premise readiness.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The node supports the following operations:

* **Response**
* Send Question: Sends a question to One-Hub and returns a non-streaming response including sources.
* **File**
* Upload: Uploads (and optionally creates intermediate folders if the API key also has role FolderCreate) and stores a file for a chat.
* Delete: Deletes a file from the chat's file storage.
* **Sync**
* Trigger Sync: Starts embedding synchronization for all files and connectors in a chat and creates a summary.
* Get Job Status: Retrieves the status of a previously started sync job.
* **Folder**
* Create: Creates a new folder in the chat's file storage.
* Delete: Deletes a folder from the chat's file storage.

## Credentials

To use this node, an API key must be created in One-Hub.

* Cloud: Create an API key at [app.one-hub.at/developer](https://app.one-hub.at/developer).
* On-Premise: Create an API key in your own One-Hub instance.
* Store the API key in the node credentials in n8n.

Optional for On-Premise:

* Set Deployment Type to On-Premise.
* Enter your own Chat API Base URL and File API Base URL.

## Compatibility

The node should work with every n8n version.

## Usage

Use this node to build One-Hub automations with n8n.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [One-Hub Developer Documentation (Cloud)](https://app.one-hub.at/developer)
* In your On-Premise instance, the developer documentation is also available and describes the available parameters and node capabilities.

## Version history

_This is another optional section. If your node has multiple versions, include a short description of available versions and what changed, as well as any compatibility impact._
