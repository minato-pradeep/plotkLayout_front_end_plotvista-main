import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';

export interface ServiceProvider {
  id: string;
  companyId: string;
  type: 'individual' | 'company';
  name: string;
  workTypes: string[];
  phones: string[];
  addresses: string[];
  photo: string;
  logo: string;
  locationQuery: string;
  radius: number;
  verified: boolean;
  active: boolean;
  description: string;
  experience: number;
  workingHours: string;
  rating: number;
  createdAt: number;
}

export interface ServiceCategory {
  id: string;
  label: string;
  emoji: string;
}

// Default emoji mapping for services
const SERVICE_EMOJI_MAP: Record<string, string> = {
  'Plumbing': '🔧',
  'Electrician': '⚡',
  'Laundry': '🧺',
  'Cleaning': '🧹',
  'Carpenter': '🪚',
  'AC Repair': '❄️',
  'Painting': '🎨',
  'Pest Control': '🐛',
  'Security': '🛡️',
  'Others': '📦',
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [];

@Injectable({ providedIn: 'root' })
export class ServiceDataService {

  services = signal<ServiceProvider[]>([]);
  categories = signal<ServiceCategory[]>([]);
  loading = signal(false);

  constructor(private auth: AuthService, private api: ApiService) {
    this.loadCategories();
  }

  private get companyId() { return this.auth.getCompanyId(); }

  /** Load service categories from admin database */
  private loadCategories(): void {
    this.api.getServices().subscribe({
      next: (res: any) => {
        const services = res.data ?? [];
        const cats: ServiceCategory[] = services
          .filter((s: any) => s.status === 'ACTIVE')
          .map((s: any) => ({
            id: s.name,
            label: s.name,
            emoji: SERVICE_EMOJI_MAP[s.name] || '🛠️'
          }));
        this.categories.set(cats);
        // Update global constant for backward compatibility
        SERVICE_CATEGORIES.length = 0;
        SERVICE_CATEGORIES.push(...cats);
      },
      error: (err) => console.error('[ServiceData] Failed to load categories:', err)
    });
  }

  /** Normalize backend response (Java enums are uppercase, dates are ISO strings) */
  private normalize(s: any): ServiceProvider {
    console.log('[ServiceData] Normalizing service:', s);
    
    // Validate critical fields
    if (!s.id) {
      console.error('[ServiceData] Service missing ID:', s);
    }
    if (!s.workTypes || !Array.isArray(s.workTypes) || s.workTypes.length === 0) {
      console.warn('[ServiceData] Service has no workTypes:', s);
    }
    if (!s.phones || !Array.isArray(s.phones) || s.phones.length === 0) {
      console.warn('[ServiceData] Service has no phones:', s);
    }
    
    const normalized = {
      ...s,
      id: s.id,
      type: (s.type as string)?.toLowerCase() as 'individual' | 'company',
      workTypes: Array.isArray(s.workTypes) ? s.workTypes : [],
      phones: Array.isArray(s.phones) ? s.phones : [],
      addresses: Array.isArray(s.addresses) ? s.addresses : [],
      photo: s.photo ?? '',
      logo: s.logo ?? '',
      locationQuery: s.locationQuery ?? '',
      radius: s.radius ?? 10,
      verified: s.verified ?? false,
      active: s.active ?? true,
      description: s.description ?? '',
      experience: s.experience ?? 0,
      workingHours: s.workingHours ?? '',
      rating: s.rating ?? 0,
      createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
    };
    
    console.log('[ServiceData] Normalized result:', normalized);
    return normalized;
  }

  reload(): void {
    if (!this.companyId) {
      console.warn('[ServiceData] No companyId available');
      return;
    }
    console.log('[ServiceData] Loading services for company:', this.companyId);
    this.loading.set(true);
    this.api.getServiceProviders(this.companyId).subscribe({
      next: (res: any) => {
        console.log('[ServiceData] Raw API response:', res);
        const rawData = res.data ?? [];
        console.log('[ServiceData] Raw data array:', rawData);
        const normalized = rawData.map((s: any) => this.normalize(s));
        console.log('[ServiceData] Normalized services:', normalized);
        this.services.set(normalized);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[ServiceData] Load error:', err);
        this.loading.set(false);
      }
    });
  }

  create(
    data: Omit<ServiceProvider, 'id' | 'companyId' | 'createdAt' | 'rating'>,
    photoFile?: File | null,
    logoFile?: File | null
  ): Observable<any> {
    return this.api.createServiceProvider(this.companyId, data, photoFile, logoFile).pipe(
      tap((res: any) => {
        if (res.success) {
          this.services.update(list => [this.normalize(res.data), ...list]);
        }
      })
    );
  }

  update(
    id: string,
    data: Partial<ServiceProvider>,
    photoFile?: File | null,
    logoFile?: File | null
  ): Observable<any> {
    return this.api.updateServiceProvider(this.companyId, id, data, photoFile, logoFile).pipe(
      tap((res: any) => {
        if (res.success) {
          this.services.update(list =>
            list.map(s => s.id === id ? this.normalize(res.data) : s)
          );
        }
      })
    );
  }

  delete(id: string): Observable<any> {
    // Optimistic remove
    this.services.update(list => list.filter(s => s.id !== id));
    return this.api.deleteServiceProvider(this.companyId, id);
  }

  toggleActive(id: string): Observable<any> {
    // Optimistic toggle
    this.services.update(list =>
      list.map(s => s.id === id ? { ...s, active: !s.active } : s)
    );
    return this.api.toggleServiceProvider(this.companyId, id).pipe(
      tap((res: any) => {
        if (res.success) {
          this.services.update(list =>
            list.map(s => s.id === id ? this.normalize(res.data) : s)
          );
        }
      })
    );
  }
}
