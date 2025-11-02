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

    export type Part = TextPart | ReasoningPart | ToolPart | StepStartPart | StepFinishPart | any; // Allow for other part types

    export interface BasePart {
        id: string;
        type: string;
    }

    export interface TextPart extends BasePart {
        type: 'text';
        text: string;
    }

    export interface ReasoningPart extends BasePart {
        type: 'reasoning';
        text: string;
    }

    export interface ToolPart extends BasePart {
        type: 'tool';
        tool: string;
        callID?: string;
        state?: {
            status?: 'pending' | 'running' | 'completed' | 'error';
            input?: any;
            output?: any;
            title?: string;
            metadata?: any;
        };
    }

    // Internal step tracking parts (not typically rendered)
    export interface StepStartPart extends BasePart {
        type: 'step-start';
        snapshot?: string;
    }

    export interface StepFinishPart extends BasePart {
        type: 'step-finish';
        reason?: string;
        snapshot?: string;
        cost?: number;
        tokens?: any;
    }
}
