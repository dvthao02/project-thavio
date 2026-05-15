import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const client = axios.create({ baseURL: 'https://provinces.open-api.vn/api' });

export interface Province { code: number; name: string; }
export interface District { code: number; name: string; }
export interface Ward    { code: number; name: string; }

export function useProvinces() {
  return useQuery<Province[]>({
    queryKey: ['vn-provinces'],
    queryFn: () => client.get<Province[]>('/?depth=1').then((r) => r.data),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime:    24 * 60 * 60 * 1000,
  });
}

export function useDistricts(provinceCode: number | null) {
  return useQuery<District[]>({
    queryKey: ['vn-districts', provinceCode],
    queryFn: () =>
      client.get<{ districts: District[] }>(`/p/${provinceCode}?depth=2`).then((r) => r.data.districts),
    enabled: !!provinceCode,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime:    24 * 60 * 60 * 1000,
  });
}

export function useWards(districtCode: number | null) {
  return useQuery<Ward[]>({
    queryKey: ['vn-wards', districtCode],
    queryFn: () =>
      client.get<{ wards: Ward[] }>(`/d/${districtCode}?depth=2`).then((r) => r.data.wards),
    enabled: !!districtCode,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime:    24 * 60 * 60 * 1000,
  });
}
