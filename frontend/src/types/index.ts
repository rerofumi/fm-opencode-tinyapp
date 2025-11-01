// This file will eventually be populated by Wails' auto-generated types.
// For now, we'll define the types we need for the UI components.

export namespace models {
    export interface Session {
        id: string;
        projectID: string;
        title: string;
        parentID?: string;
        time: {
            created: number;
            updated: number;
        };
        share?: {
            url: string;
        };
    }

    export interface ServerConfig {
        theme?: string;
        model?: string;
        // Other fields are omitted for brevity.
    }

    // Message and Part types
    export interface Message {
        id: string;
        sessionID: string;
        role: 'user' | 'assistant';
        time: {
            created: number;
            completed?: number;
        };
        modelID?: string;
        providerID?: string;
    }

    export interface MessageWithParts {
        info: Message;
        parts: Part[];
    }

    export type Part = TextPart | ToolPart | any; // Allow for other part types

    export interface BasePart {
        id: string;
        type: string;
    }

    export interface TextPart extends BasePart {
        type: 'text';
        text: string;
    }

    export interface ToolPart extends BasePart {
        type: 'tool';
        tool: string;
        state: any; // Can be string or object
    }
}
