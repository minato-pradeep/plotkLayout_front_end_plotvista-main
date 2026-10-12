import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  //private base = '/api';
    private base = 'http://103.59.134.16:8082/api';  // production server
    //private base = 'http://192.168.150.100:8082/api';
    //private base = 'http://localhost:8082/api';  // local dev
  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  // Auth
  login(body: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.base}/auth/login`, body);
  }

  changePassword(body: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.put(`${this.base}/auth/change-password`, body, { headers: this.headers() });
  }

  changeUsername(body: { newUsername: string }): Observable<any> {
    return this.http.put(`${this.base}/auth/change-username`, body, { headers: this.headers() });
  }

  // Sub-classifications (for sidebar)
  getSubClassifications(companyId: string): Observable<any> {
    return this.http.get(`${this.base}/sub-classifications/company/${companyId}`, { headers: this.headers() });
  }

  // Project layout
  getProject(companyId: string): Observable<any> {
    return this.http.get(`${this.base}/projects/company/${companyId}`, { headers: this.headers() });
  }

  // Granular layout endpoints
  getLayoutMeta(companyId: string): Observable<any> {
    return this.http.get(`${this.base}/projects/company/${companyId}/layout/meta`, { headers: this.headers() });
  }

  getLayoutPlots(companyId: string): Observable<any> {
    return this.http.get(`${this.base}/projects/company/${companyId}/layout/plots`, { headers: this.headers() });
  }

  getLayoutPlot(companyId: string, plotKey: string): Observable<any> {
    return this.http.get(`${this.base}/projects/company/${companyId}/layout/plots/${encodeURIComponent(plotKey)}`, { headers: this.headers() });
  }

  savePlot(companyId: string, plotKey: string, plotData: any): Observable<any> {
    return this.http.put(`${this.base}/projects/company/${companyId}/layout/plots/${encodeURIComponent(plotKey)}`, plotData, { headers: this.headers() });
  }

  deletePlot(companyId: string, plotKey: string): Observable<any> {
    return this.http.delete(`${this.base}/projects/company/${companyId}/layout/plots/${encodeURIComponent(plotKey)}`, { headers: this.headers() });
  }

  saveLayoutMeta(companyId: string, meta: any): Observable<any> {
    return this.http.put(`${this.base}/projects/company/${companyId}/layout/meta`, meta, { headers: this.headers() });
  }

  saveLayout(companyId: string, layoutJson: any): Observable<any> {
    return this.http.put(`${this.base}/projects/company/${companyId}/layout`, { layoutJson: JSON.stringify(layoutJson) }, { headers: this.headers() });
  }

  resetLayout(companyId: string): Observable<any> {
    return this.http.delete(`${this.base}/projects/company/${companyId}/layout/reset`, { headers: this.headers() });
  }

  // Layout customers (plot bookings)
  getLayoutCustomers(projectId: string): Observable<any> {
    return this.http.get(`${this.base}/layout-customers/project/${projectId}`, { headers: this.headers() });
  }

  getLayoutCustomersAll(projectId: string): Observable<any> {
    return this.http.get(`${this.base}/layout-customers/project/${projectId}/all`, { headers: this.headers() });
  }

  getPlotBooking(projectId: string, plotId: string): Observable<any> {
    return this.http.get(`${this.base}/layout-customers/project/${projectId}/plot/${encodeURIComponent(plotId)}`, { headers: this.headers() });
  }

  getPlotBookings(projectId: string, plotId: string): Observable<any> {
    return this.http.get(`${this.base}/layout-customers/project/${projectId}/plot/${encodeURIComponent(plotId)}/all`, { headers: this.headers() });
  }

  bookPlot(formData: FormData): Observable<any> {
    return this.http.post(`${this.base}/layout-customers`, formData, { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` }) });
  }

  vacatePlot(projectId: string, plotId: string): Observable<any> {
    return this.http.delete(
      `${this.base}/layout-customers/project/${projectId}/plot/${encodeURIComponent(plotId)}/vacate`,
      { headers: this.headers() }
    );
  }

  vacateBooking(bookingId: string): Observable<any> {
    return this.http.delete(`${this.base}/layout-customers/${bookingId}/vacate`, { headers: this.headers() });
  }

  updateBooking(bookingId: string, params: Record<string, any>, document?: File): Observable<any> {
    const fd = new FormData();
    Object.keys(params).forEach(k => fd.append(k, params[k]));
    if (document) fd.append('document', document);
    return this.http.put(`${this.base}/layout-customers/${bookingId}`, fd, { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` }) });
  }

  // Apartment Parking
  getApartmentParkingList(projectId: string): Observable<any> {
    return this.http.get(`${this.base}/apartment-parking/project/${projectId}`, { headers: this.headers() });
  }

  getApartmentCustomers(projectId: string, apartmentId: string): Observable<any> {
    return this.http.get(`${this.base}/apartment-parking/project/${projectId}/apartment/${encodeURIComponent(apartmentId)}/customers`, { headers: this.headers() });
  }

  checkParkingSpot(projectId: string, parkingId: string): Observable<any> {
    return this.http.get(`${this.base}/apartment-parking/project/${projectId}/spot/${encodeURIComponent(parkingId)}/check`, { headers: this.headers() });
  }

  allocateApartmentParking(body: any): Observable<any> {
    return this.http.post(`${this.base}/apartment-parking/project/${body.projectId}/allocate`, body, { headers: this.headers() });
  }

  removeApartmentParking(id: string): Observable<any> {
    return this.http.delete(`${this.base}/apartment-parking/${id}`, { headers: this.headers() });
  }

  createParkingFloors(projectId: string, config: any): Observable<any> {
    return this.http.post(`${this.base}/apartment-parking/project/${projectId}/create-parking-floors`, config, { headers: this.headers() });
  }

  calculateAndCreateParkingFloors(floors: number, unitsPerFloor: number): Observable<any> {
    const user = this.auth.user();
    if (!user) throw new Error('Not authenticated');
    const projectId = localStorage.getItem('pv_projectId') || user.companyId;
    if (!projectId) throw new Error('Project ID not found');
    const parkingFloors = Math.ceil(floors / 4);
    return this.createParkingFloors(projectId, { floors, unitsPerFloor, parkingFloors });
  }

  getProfessions(companyId: string): Observable<any> {
    return this.http.get(`${this.base}/professions/company/${companyId}`, { headers: this.headers() });
  }

  // Services (from admin database)
  getServices(): Observable<any> {
    return this.http.get(`${this.base}/services`, { headers: this.headers() });
  }

  // Sub-classifications CRUD for company user
  createSubClassification(companyId: string, name: string, classificationName: string, iconFile?: File): Observable<any> {
    if (iconFile) {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('classificationName', classificationName);
      fd.append('logo', iconFile);
      return this.http.post(
        `${this.base}/sub-classifications/company/${companyId}`, fd,
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` }) }
      );
    }
    return this.http.post(
      `${this.base}/sub-classifications/company/${companyId}`,
      { name, classificationName },
      { headers: this.headers() }
    );
  }

  updateSubClassification(id: string, companyId: string, name: string): Observable<any> {
    return this.http.put(`${this.base}/sub-classifications/${id}/company/${companyId}`, { name }, { headers: this.headers() });
  }

  deleteSubClassification(id: string, companyId: string): Observable<any> {
    return this.http.delete(`${this.base}/sub-classifications/${id}/company/${companyId}`, { headers: this.headers() });
  }

  toggleSubClassificationStatus(id: string, companyId: string): Observable<any> {
    return this.http.patch(`${this.base}/sub-classifications/${id}/company/${companyId}/status`, {}, { headers: this.headers() });
  }

  // ── Service Providers (admin-service) ───────────────────────────────────

  getServiceProviders(companyId: string): Observable<any> {
    return this.http.get(`${this.base}/admin/service-providers?companyId=${companyId}`, { headers: this.headers() });
  }

  createServiceProvider(companyId: string, data: any, photoFile?: File | null, logoFile?: File | null): Observable<any> {
    const authHeader = new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
    // If no files, send as plain JSON — more compatible with most backends
    if (!photoFile && !logoFile) {
      return this.http.post(`${this.base}/admin/service-providers`,
        { companyId, ...data },
        { headers: authHeader.set('Content-Type', 'application/json') });
    }
    // With files, send as multipart FormData with all fields spread flat
    const fd = new FormData();
    fd.append('companyId', companyId);
    Object.entries(data).forEach(([k, v]) => {
      if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
      else if (v !== null && v !== undefined) fd.append(k, String(v));
    });
    if (photoFile) fd.append('photo', photoFile);
    if (logoFile) fd.append('logo', logoFile);
    return this.http.post(`${this.base}/admin/service-providers`, fd,
      { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` }) });
  }

  updateServiceProvider(companyId: string, id: string, data: any, photoFile?: File | null, logoFile?: File | null): Observable<any> {
    const authHeader = new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
    if (!photoFile && !logoFile) {
      return this.http.put(`${this.base}/admin/service-providers/${id}`,
        { companyId, ...data },
        { headers: authHeader.set('Content-Type', 'application/json') });
    }
    const fd = new FormData();
    fd.append('companyId', companyId);
    Object.entries(data).forEach(([k, v]) => {
      if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
      else if (v !== null && v !== undefined) fd.append(k, String(v));
    });
    if (photoFile) fd.append('photo', photoFile);
    if (logoFile) fd.append('logo', logoFile);
    return this.http.put(`${this.base}/admin/service-providers/${id}`, fd,
      { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` }) });
  }

  deleteServiceProvider(companyId: string, id: string): Observable<any> {
    return this.http.delete(`${this.base}/admin/service-providers/${id}`, { headers: this.headers() });
  }

  toggleServiceProvider(companyId: string, id: string): Observable<any> {
    return this.http.patch(`${this.base}/admin/service-providers/${id}/toggle-active`, {}, { headers: this.headers() });
  }

  // Parking floors
  saveParkingFloor(companyId: string, floorData: any): Observable<any> {
    return this.http.put(
      `${this.base}/projects/company/${companyId}/parking/floors/${floorData.id}`,
      floorData,
      { headers: this.headers() }
    );
  }

  // ── Company Payments ────────────────────────────────────────────────────

  getCompanyPayments(projectId: string): Observable<any> {
    return this.http.get(`${this.base}/company-payments/project/${projectId}`, { headers: this.headers() });
  }

  getCompanyPayment(projectId: string, plotId: string): Observable<any> {
    return this.http.get(`${this.base}/company-payments/project/${projectId}/plot/${encodeURIComponent(plotId)}`, { headers: this.headers() });
  }

  updateCompanyPayment(projectId: string, plotId: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/company-payments/project/${projectId}/plot/${encodeURIComponent(plotId)}`, data, { headers: this.headers() });
  }

  bulkUpdateCompanyPayments(projectId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/company-payments/project/${projectId}/bulk-update`, data, { headers: this.headers() });
  }

  deleteCompanyPayment(projectId: string, plotId: string): Observable<any> {
    return this.http.delete(`${this.base}/company-payments/project/${projectId}/plot/${encodeURIComponent(plotId)}`, { headers: this.headers() });
  }

  // ── Service Companies (Third-party companies for payment) ──────────────────────

  getServiceCompanies(companyId?: string): Observable<any> {
    const url = companyId ? `${this.base}/service-companies?companyId=${companyId}` : `${this.base}/service-companies`;
    return this.http.get(url, { headers: this.headers() });
  }

  getActiveServiceCompanies(companyId?: string): Observable<any> {
    const url = companyId ? `${this.base}/service-companies/active?companyId=${companyId}` : `${this.base}/service-companies/active`;
    return this.http.get(url, { headers: this.headers() });
  }

  getServiceCompany(id: string): Observable<any> {
    return this.http.get(`${this.base}/service-companies/${id}`, { headers: this.headers() });
  }

  createServiceCompany(data: any): Observable<any> {
    return this.http.post(`${this.base}/service-companies`, data, { headers: this.headers() });
  }

  updateServiceCompany(id: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/service-companies/${id}`, data, { headers: this.headers() });
  }

  deleteServiceCompany(id: string): Observable<any> {
    return this.http.delete(`${this.base}/service-companies/${id}`, { headers: this.headers() });
  }

  searchServiceCompanies(query: string): Observable<any> {
    return this.http.get(`${this.base}/service-companies/search?query=${query}`, { headers: this.headers() });
  }
}
