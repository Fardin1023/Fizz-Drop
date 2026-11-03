export interface FranchiseGroup<T = any> {
  franchiseName: string;
  totalBranches: number;
  divisions: string[];
  cities: string[];
  branches: T[];
}

export const COMMON_FRANCHISE_BRANDS = [
  'Shwapno',
  'Unimart',
  'Meena Bazar',
  'Agora',
  'Prince Bazar',
  'Daily Shopping',
  'Almas Super Shop',
];

export const extractFranchiseName = (
  outletName: string = '',
  franchiseName?: string
): string => {
  if (franchiseName && franchiseName.trim()) {
    return franchiseName.trim();
  }
  const lower = outletName.toLowerCase();
  if (lower.includes('shwapno')) return 'Shwapno';
  if (lower.includes('unimart')) return 'Unimart';
  if (lower.includes('meena') || lower.includes('meenabazar')) return 'Meena Bazar';
  if (lower.includes('agora')) return 'Agora';
  if (lower.includes('prince')) return 'Prince Bazar';
  if (lower.includes('daily shopping') || lower.includes('dailyshopping')) return 'Daily Shopping';
  if (lower.includes('almas')) return 'Almas Super Shop';

  // Check delimiter " — " or " - "
  if (outletName.includes('—')) {
    const p = outletName.split('—')[0].trim();
    if (p) return p;
  }
  if (outletName.includes(' - ')) {
    const p = outletName.split(' - ')[0].trim();
    if (p) return p;
  }

  // Remove trailing generic retail terms
  const cleaned = outletName.replace(/\s+(store|shop|super shop|outlet|superstore|branch)$/i, '').trim();
  return cleaned || outletName || 'Independent Outlet';
};

export const extractBranchName = (
  outletName: string = '',
  branchName?: string,
  area?: string,
  city?: string
): string => {
  if (branchName && branchName.trim()) {
    return branchName.trim();
  }
  if (outletName.includes('—')) {
    const p = outletName.split('—')[1].trim();
    if (p) return p;
  }
  if (outletName.includes(' - ')) {
    const p = outletName.split(' - ')[1].trim();
    if (p) return p;
  }
  if (area && area.trim()) {
    return `${area.trim()} Branch`;
  }
  if (city && city.trim()) {
    return `${city.trim()} Hub`;
  }
  return 'Main Branch';
};

export const groupOutletsByFranchise = <T extends {
  outlet_id?: number | string;
  outlet_name?: string;
  franchise_name?: string;
  branch_name?: string;
  city?: string;
  area?: string;
  division_name?: string;
  district_name?: string;
}>(outlets: T[]): FranchiseGroup<T>[] => {
  const map: Record<string, FranchiseGroup<T>> = {};

  outlets.forEach((o) => {
    const fName = extractFranchiseName(o.outlet_name, o.franchise_name);
    const bName = extractBranchName(o.outlet_name, o.branch_name, o.area, o.city);
    const enriched = {
      ...o,
      franchise_name: fName,
      branch_name: bName,
    };

    if (!map[fName]) {
      map[fName] = {
        franchiseName: fName,
        totalBranches: 0,
        divisions: [],
        cities: [],
        branches: [],
      };
    }

    const group = map[fName];
    group.totalBranches += 1;
    group.branches.push(enriched);

    const div = o.division_name;
    if (div && !group.divisions.includes(div)) {
      group.divisions.push(div);
    }

    const c = o.city || o.district_name;
    if (c && !group.cities.includes(c)) {
      group.cities.push(c);
    }
  });

  return Object.values(map).sort((a, b) => b.totalBranches - a.totalBranches);
};
