export namespace models {
	
	export class AgentConfig {
	    model?: string;
	    temperature?: number;
	    prompt?: string;
	    tools?: Record<string, boolean>;
	
	    static createFrom(source: any = {}) {
	        return new AgentConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.model = source["model"];
	        this.temperature = source["temperature"];
	        this.prompt = source["prompt"];
	        this.tools = source["tools"];
	    }
	}
	export class ServerConfig {
	    theme?: string;
	    model?: string;
	    agent?: Record<string, AgentConfig>;
	    provider?: Record<string, any>;
	    keybinds?: any;
	
	    static createFrom(source: any = {}) {
	        return new ServerConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.model = source["model"];
	        this.agent = this.convertValues(source["agent"], AgentConfig, true);
	        this.provider = source["provider"];
	        this.keybinds = source["keybinds"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Share {
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new Share(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	    }
	}
	export class Time {
	    created: number;
	    updated: number;
	
	    static createFrom(source: any = {}) {
	        return new Time(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.created = source["created"];
	        this.updated = source["updated"];
	    }
	}
	export class Session {
	    id: string;
	    projectID: string;
	    title: string;
	    parentID?: string;
	    time: Time;
	    share?: Share;
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.projectID = source["projectID"];
	        this.title = source["title"];
	        this.parentID = source["parentID"];
	        this.time = this.convertValues(source["time"], Time);
	        this.share = this.convertValues(source["share"], Share);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

