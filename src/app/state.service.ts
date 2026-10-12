import { Injectable, signal } from '@angular/core';
import { GlobalState, PlotData, PlotType, AptConfig, Resident, SplitHalf, LayoutSection } from '../types';

const DEFAULT_H_NAMES = ['Maple Avenue', 'Birch Lane', 'Cedar Boulevard', 'Oakwood Drive', 'Elm Street', 'Rosewood Path', 'Willow Walk', 'Jasmine Court'];
const DEFAULT_V_NAMES = ['Gold Crescent', 'Silver Close', 'Diamond Road', 'Pearl Way', 'Emerald Row', 'Sapphire Drive', 'Ruby Street', 'Ivory Lane'];

export function makeSection(overrides: Partial<LayoutSection> = {}): LayoutSection {
  return {
    id: Math.random().toString(36).slice(2),
    hStreets: 1,
    vStreets: 1,
    plotsPerBlock: 2,
    hStreetNames: [...DEFAULT_H_NAMES],
    vStreetNames: [...DEFAULT_V_NAMES],
    plots: {},
    mergeGroups: [],
    ...overrides
  };
}

@Injectable({
  providedIn: 'root'
})
export class StateService {
  state = signal<GlobalState>({
    hStreets: 2,
    vStreets: 2,
    hStreetNames: [...DEFAULT_H_NAMES],
    vStreetNames: [...DEFAULT_V_NAMES],
    plotsPerBlock: 2,
    plots: {},
    selectedKey: null,
    selectedHalf: null,
    mergeGroups: [],
    sections: [],
    activeSectionId: ''
  });

  undoStack = signal<{ plots: Record<string, PlotData>; mergeGroups: string[][] }[]>([]);
  redoStack = signal<{ plots: Record<string, PlotData>; mergeGroups: string[][] }[]>([]);

  saveState() {
    this.undoStack.update(stack => {
      const copy = {
        plots: JSON.parse(JSON.stringify(this.state().plots)),
        mergeGroups: JSON.parse(JSON.stringify(this.state().mergeGroups || []))
      };
      const newStack = [...stack, copy];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    this.redoStack.set([]);
  }

  undo() {
    const stack = this.undoStack();
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    const current = {
      plots: JSON.parse(JSON.stringify(this.state().plots)),
      mergeGroups: JSON.parse(JSON.stringify(this.state().mergeGroups || []))
    };
    this.redoStack.update(s => [...s, current]);
    this.undoStack.update(s => s.slice(0, -1));
    this.state.update(s => ({ ...s, plots: prev.plots, mergeGroups: prev.mergeGroups }));
  }

  redo() {
    const stack = this.redoStack();
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    const current = {
      plots: JSON.parse(JSON.stringify(this.state().plots)),
      mergeGroups: JSON.parse(JSON.stringify(this.state().mergeGroups || []))
    };
    this.undoStack.update(s => [...s, current]);
    this.redoStack.update(s => s.slice(0, -1));
    this.state.update(s => ({ ...s, plots: next.plots, mergeGroups: next.mergeGroups }));
  }

  selectPlot(key: string | null, half: 'a' | 'b' | null = null) {
    this.state.update(s => ({ ...s, selectedKey: key, selectedHalf: half }));
  }

  updatePlot(key: string, data: Partial<PlotData>) {
    this.state.update(s => {
      const plots = { ...s.plots };
      const current = plots[key] || { type: 'vacant', residents: [] };
      const half = s.selectedHalf;

      if (current.splitDirection && half) {
        // Update specific half
        const splitData = { ...current.splitData! };
        splitData[half] = { ...splitData[half], ...(data as any) };
        plots[key] = { ...current, splitData };
      } else {
        // Update main plot
        plots[key] = {
          ...current,
          ...data
        };
      }
      return { ...s, plots };
    });
  }

  addResident(key: string, resident: Resident) {
    this.state.update(s => {
      const plots = { ...s.plots };
      const plot = plots[key] || { type: 'vacant', residents: [] };
      const half = s.selectedHalf;

      if (plot.splitDirection && half) {
        const splitData = { ...plot.splitData! };
        splitData[half] = {
          ...splitData[half],
          residents: [...splitData[half].residents, resident]
        };
        plots[key] = { ...plot, splitData };
      } else {
        plots[key] = {
          ...plot,
          residents: [...plot.residents, resident]
        };
      }
      return { ...s, plots };
    });
  }

  updateUnitDetail(key: string, unitId: string, detail: { rent?: number; sqft?: number }) {
    this.state.update(s => {
      const plots = { ...s.plots };
      const plot = plots[key];
      if (!plot || !plot.aptConfig) return s;

      const unitDetails = { ...(plot.aptConfig.unitDetails || {}) };
      unitDetails[unitId] = { ...(unitDetails[unitId] || {}), ...detail };

      plots[key] = {
        ...plot,
        aptConfig: {
          ...plot.aptConfig,
          unitDetails
        }
      };
      return { ...s, plots };
    });
  }
  mergePlots(keys: string[]) {
    if (keys.length < 2) return;
    this.state.update(s => {
      // Remove any existing groups that contain these keys
      const cleaned = (s.mergeGroups || []).filter(
        g => !g.some(k => keys.includes(k))
      );
      return { ...s, mergeGroups: [...cleaned, keys] };
    });
  }

  unmerge(key: string) {
    this.state.update(s => ({
      ...s,
      mergeGroups: (s.mergeGroups || []).filter(g => !g.includes(key))
    }));
  }

  splitPlot(key: string, direction: 'h' | 'v') {
    this.state.update(s => {
      const plots = { ...s.plots };
      const existing = plots[key] || { type: 'vacant' as PlotType, residents: [] };
      plots[key] = {
        ...existing,
        splitDirection: direction,
        splitData: {
          a: { type: 'vacant', name: direction === 'v' ? 'LEFT' : 'TOP', residents: [] },
          b: { type: 'vacant', name: direction === 'v' ? 'RIGHT' : 'BOTTOM', residents: [] }
        }
      };
      return { ...s, plots, selectedHalf: 'a' };
    });
  }

  unsplitPlot(key: string) {
    this.state.update(s => {
      const plots = { ...s.plots };
      const existing = plots[key];
      if (existing) {
        const { splitDirection, splitData, ...rest } = existing;
        plots[key] = { ...rest, splitDirection: undefined, splitData: undefined };
      }
      return { ...s, plots, selectedHalf: null };
    });
  }

  updateStreetName(type: 'h' | 'v', index: number, name: string) {
    this.state.update(s => {
      if (type === 'h') {
        const hStreetNames = [...(s.hStreetNames || [])];
        hStreetNames[index] = name;
        return { ...s, hStreetNames };
      } else {
        const vStreetNames = [...(s.vStreetNames || [])];
        vStreetNames[index] = name;
        return { ...s, vStreetNames };
      }
    });
  }

  setBlockOverride(r: number, c: number, rows: number, cols: number) {
    this.state.update(s => {
      const key = `${r}_${c}`;
      const blockOverrides = { ...(s.blockOverrides || {}), [key]: { rows, cols } };
      return { ...s, blockOverrides };
    });
  }

  clearBlockOverride(r: number, c: number) {
    this.state.update(s => {
      const key = `${r}_${c}`;
      const blockOverrides = { ...(s.blockOverrides || {}) };
      delete blockOverrides[key];
      return { ...s, blockOverrides };
    });
  }
}
