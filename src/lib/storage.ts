import type { Project } from '../types'

const STORAGE_KEY = 'appforge_project'

/**
 * Salva o projeto no localStorage. 
 * A integração com Supabase foi removida temporariamente para garantir o build.
 */
export async function saveProject(project: Project): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch (err) {
    console.warn('Erro ao salvar no localStorage:', err);
  }
}

/**
 * Carrega o projeto do localStorage.
 */
export async function loadProject(id: string): Promise<Project | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const project = JSON.parse(raw) as Project
    return project.id === id ? project : null
  } catch (err) {
    console.warn('Erro ao carregar do localStorage:', err);
    return null
  }
}