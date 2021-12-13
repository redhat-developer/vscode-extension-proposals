import { type } from "os";

export interface Recommendation {
    id: string, 
    label: string,
    message: string, 
    source?: string,
    timestamp: number,
    choice?: UserChoice
}

export enum UserChoice {
	Install = "Install",
	Never = "Never",
	Later = "Later",
}