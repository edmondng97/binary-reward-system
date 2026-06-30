export interface TreeNodeDTO {
  id: string;
  username: string;
  userId?: string;
  placementId: string | null;
  position: 'L' | 'R' | null;
  leftChildId: string | null;
  rightChildId: string | null;
  carryLeft: number;
  carryRight: number;
}
export interface UserDTO { id: string; username: string; walletBalance: number; }
export interface WalletTxnDTO {
  _id: string; userId: string; type: string; amount: number;
  refId: string | null; balanceAfter: number; createdAt?: string;
}
export interface SettlementRecord {
  nodeId: string; pairedAmount: number; bonus: number;
  cappedAmount: number; carryLeftAfter: number; carryRightAfter: number;
}
export interface LatestSettlement {
  batchId: string; triggeredBy: string; totalBonus: number;
  endedAt: string | null; records: SettlementRecord[];
}
