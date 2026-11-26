import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { Etudiant } from '../../models/etudiant';
import { Instrument } from '../../models/instrument';
import { Seance } from '../../models/seance';
import { EtudiantService } from '../../services/etudiant-service';
import { InstrumentService } from '../../services/instrument-service';
import { JourPipe } from '../../pipes/jour-pipe';

@Component({
  selector: 'app-admin-etudiant-detail',
  imports: [RouterLink, DatePipe, JourPipe, FormRoot, FormField],
  templateUrl: './admin-etudiant-detail.html'
})
export class AdminEtudiantDetail implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly etudiantService = inject(EtudiantService);
  private readonly instrumentService = inject(InstrumentService);

  instruments = this.instrumentService.instruments;
  etudiant = signal<Etudiant | undefined>(undefined);
  introuvable = signal(false);
  aujourdhui = new Date().toISOString().slice(0, 10);

  readonly seanceModel = signal({ type: 'instrument', instrumentId: '', date: '', heure: '' });
  readonly seanceForm = form(this.seanceModel, path => {
    required(path.type, { message: 'Choisissez le type de cours' });
    required(path.date, { message: 'La date est obligatoire' });
    required(path.heure, { message: "L'heure est obligatoire" });
  });

  instrumentsEtudiant = computed(() => {
    const e = this.etudiant();
    if (!e) return [];
    return e.instrumentIds
      .map(id => this.instruments().find(i => i.id == id))
      .filter((i): i is Instrument => i !== undefined);
  });

  planning = computed(() => {
    const e = this.etudiant();
    if (!e) return [];
    return [...e.seances]
      .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))
      .map(s => ({ seance: s, libelle: this.libelle(s) }));
  });

  datePassee = computed(() => {
    const date = this.seanceModel().date;
    return date != '' && date < this.aujourdhui;
  });

  conflit = computed(() => {
    const e = this.etudiant();
    const saisie = this.seanceModel();
    return !!e && saisie.date != '' && saisie.heure != ''
      && e.seances.some(s => s.date == saisie.date && s.heure == saisie.heure);
  });

  solfegeInterdit = computed(() =>
    this.seanceModel().type == 'solfege' && !this.etudiant()?.solfege
  );

  instrumentManquant = computed(() =>
    this.seanceModel().type == 'instrument' && this.seanceModel().instrumentId == ''
  );

  peutAjouter = computed(() =>
    !this.seanceForm().invalid()
    && !this.datePassee()
    && !this.conflit()
    && !this.solfegeInterdit()
    && !this.instrumentManquant()
  );

  ngOnInit(): void {
    this.instrumentService.getInstruments().subscribe();
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.etudiantService.getEtudiantById(id).subscribe({
        next: e => this.etudiant.set(e),
        error: () => this.introuvable.set(true)
      });
    }
  }

  libelle(s: Seance): string {
    if (s.type == 'solfege') return 'Solfège';
    return this.instruments().find(i => i.id == s.instrumentId)?.nom ?? 'Cours';
  }

  onAdd() {
    const e = this.etudiant();
    if (!e || !this.peutAjouter()) return;

    const saisie = this.seanceModel();
    const seance: Seance = {
      id: crypto.randomUUID().slice(0, 8),
      type: saisie.type,
      instrumentId: saisie.type == 'instrument' ? saisie.instrumentId : undefined,
      date: saisie.date,
      heure: saisie.heure
    };

    this.etudiantService.modifier({ ...e, seances: [...e.seances, seance] }).subscribe(maj => {
      this.etudiant.set(maj);
      this.seanceModel.set({ type: saisie.type, instrumentId: saisie.instrumentId, date: '', heure: '' });
    });
  }

  aRetirer = signal<Seance | undefined>(undefined);

  onRemove(s: Seance) {
    this.aRetirer.set(s);
  }

  onConfirmRemove() {
    const e = this.etudiant();
    const s = this.aRetirer();
    this.aRetirer.set(undefined);
    if (!e || !s) return;
    this.etudiantService.modifier({ ...e, seances: e.seances.filter(x => x.id != s.id) }).subscribe(
      maj => this.etudiant.set(maj)
    );
  }

  onCancelRemove() {
    this.aRetirer.set(undefined);
  }
}