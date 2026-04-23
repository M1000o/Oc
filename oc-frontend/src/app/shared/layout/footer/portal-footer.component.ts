import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-portal-footer',
  templateUrl: './portal-footer.component.html',
  styleUrl: './portal-footer.component.css'
})
export class PortalFooterComponent {
  @Input() year = new Date().getFullYear();
}