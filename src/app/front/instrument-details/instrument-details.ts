import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Instrument } from '../../models/instrument';
import { InstrumentService } from '../../services/instrument-service';
import { CartService } from '../../services/cart-service';
import { EtudiantService } from '../../services/etudiant-service';
import { DureePipe } from '../../pipes/duree-pipe';
import { PRIX_SOLFEGE } from '../../config';

@Component({
  selector: 'app-instrument-details',
  imports: [DatePipe, DureePipe],
  templateUrl: './instrument-details.html'
})
export class InstrumentDetails implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly instrumentService = inject(InstrumentService);
  readonly cartService = inject(CartService);
  private readonly etudiantService = inject(EtudiantService);

  instrument = signal<Instrument | undefined>(undefined);
  introuvable = signal(false);
  prixSolfege = PRIX_SOLFEGE;

  dejaInscrit = computed(() => {
    const i = this.instrument();
    const e = this.etudiantService.etudiant();
    if (!i || !e) return false;
    return e.instrumentIds.includes(i.id);
  });

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.instrumentService.getInstrumentById(id).subscribe({
        next: i => this.instrument.set(i),
        error: () => this.introuvable.set(true)
      });
    }
  }

  onAddToCart(i: Instrument) {
    this.cartService.add(i);
  }

  onBack() {
    this.router.navigate(['/instruments']);
  }
}