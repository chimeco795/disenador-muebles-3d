import { catalog, type Material, type Project } from '../model';
export const materialCategory = (m: Material) => m.category ?? (m.id.startsWith('liston') ? 'Listones' : m.materialType === 'MDF' ? 'MDF' : m.materialType === 'Triplay' ? 'Triplay' : m.family === 'Tableros' ? 'Otros tableros' : 'Tablas');
export const projectCatalog = (project: Project) => [...catalog, ...(project.customMaterials ?? [])];
