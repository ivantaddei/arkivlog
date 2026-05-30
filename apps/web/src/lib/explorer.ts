const BASE = "https://explorer.braga.hoodi.arkiv.network";

export function explorerEntityUrl(entityKey: string) {
  return `${BASE}/entity/${entityKey}`;
}

export function explorerAddressUrl(address: string) {
  return `${BASE}/address/${address}`;
}
