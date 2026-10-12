import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ParkingComponent } from './components/parking/parking.component';
import { AppComponent } from './app.component';
import { ForceChangeComponent } from './components/force-change/force-change.component';
import { AuthGuard, ForceChangeGuard } from './guards/auth.guard';
import { CustomerManagementComponent } from './components/customer-management/customer-management.component';
import { PaymentManagementComponent } from './components/payment-management/payment-management.component';
import { ServiceManagementComponent } from './components/service-management/service-management.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter([
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'force-change', component: ForceChangeComponent, canActivate: [ForceChangeGuard] },
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
      { path: 'layout', component: AppComponent, canActivate: [AuthGuard] },
      { path: 'parking', component: ParkingComponent, canActivate: [AuthGuard] },
      { path: 'customer-management', component: CustomerManagementComponent, canActivate: [AuthGuard] },
      { path: 'payment-management', component: PaymentManagementComponent, canActivate: [AuthGuard] },
      { path: 'services', component: ServiceManagementComponent, canActivate: [AuthGuard] },
      { path: '**', redirectTo: 'login' }
    ])
  ]
};
