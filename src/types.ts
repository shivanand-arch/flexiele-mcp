// Flexiele API types

export interface OrgNode {
  empId: number | string;
  name: string;
  unit?: {
    type: number | string;
    value: string;
  };
  office?: string;
  positionName?: string;
  mgrId?: number | string;
  children?: OrgNode[];
  imageUrl?: string;
  area?: string;
  tags?: string;
  isLoggedUser?: number;
  profileUrl?: string;
}

export interface OrgDataResponse {
  data: {
    upHirarchy?: OrgNode;
    downHirarchy?: OrgNode;
  };
}

export interface UserData {
  empId: number;
  empName: string;
  emailId: string;
  empCode: string;
  [key: string]: unknown;
}

export interface UserInfoResponse {
  data: {
    userData: UserData;
    menuData: unknown[];
  };
}

export interface EmployeeMatch {
  empId: number | string;
  name: string;
  positionName?: string;
  unit?: { type: number | string; value: string };
  office?: string;
  mgrId?: number | string;
  managerChain?: string[];
}

export interface OrgStats {
  totalHeadcount: number;
  byUnit: Record<string, number>;
  byOffice: Record<string, number>;
  byPosition: Record<string, number>;
}
