export type ApprovalLevel = 'auto' | 'review' | 'approve' 

export interface Tool {
name: string
description: string
approvalLevel: ApprovalLevel
execute: (params: any) => Promise<any> 
}