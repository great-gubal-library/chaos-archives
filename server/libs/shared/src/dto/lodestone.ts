export interface PagedResult<T> {
  Pagination: {
    Page: number;
    PageNext: number | null;
    PagePrev: number | null;
    PageTotal: number;
    Results: number;
    ResultsPerPage: number;
    ResultsTotal: number;
  };
  Results: T[];
}

export interface CharacterSearchEntry {
  Avatar: string;
  FeastMatches: number;
  ID: number;
  Lang: string;
  Name: string;
  Rank: number | null;
  RankIcon: string | null;
  Server: string;
}

export interface CharacterInfo {
  Avatar: string;
  Bio: string;
  DC: string;
  ID: number;
  Name: string;
  Race: string;
  World: string;
  FreeCompany: {
    ID: string;
  }|null;
}

export interface FreeCompanyInfo {
  ID: number;
  CrestLayers: {
    Bottom: string;
    MIDdle: string;
    Top: string;
  };
  Timestamp: number;
  Name: string;
  Tag: string;
  Members: FreeCompanyMemberInfo[];
}

export interface FreeCompanyMemberInfo {
  ID: number;
  Name: string;
}
