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
}
