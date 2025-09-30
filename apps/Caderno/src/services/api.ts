// Configuração da API
const API_BASE_URL = window.location.origin;

// Tipos TypeScript
export interface Course {
  id: number;
  name: string;
  color?: string;
}

export interface Subject {
  id: number;
  name: string;
  color?: string;
  course_id?: number;
}

export interface Notebook {
  id: number;
  title: string;
  color?: string;
  subject_id?: number;
  course_id?: number;
  created?: string;
  pages_count: number;
}

export interface NotebookPage {
  id: number;
  title: string;
  color?: string;
  content: string;
  subject_id?: number;
  created?: string;
  updated?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  items?: T[];
  message?: string;
  id?: number;
}

// Função auxiliar para fazer requisições
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/server/api${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Para incluir cookies de sessão
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Serviços da API
export const api = {
  // Cursos
  courses: {
    async getAll(): Promise<Course[]> {
      const response = await apiRequest<Course>('/courses.php');
      return response.items || [];
    },

    async create(course: Omit<Course, 'id'>): Promise<number> {
      const response = await apiRequest<Course>('/courses.php', {
        method: 'POST',
        body: JSON.stringify(course),
      });
      return response.id || 0;
    },
  },

  // Matérias
  subjects: {
    async getAll(courseId?: number): Promise<Subject[]> {
      const params = courseId ? `?course_id=${courseId}` : '';
      const response = await apiRequest<Subject>(`/subjects.php${params}`);
      return response.items || [];
    },

    async create(subject: Omit<Subject, 'id'>): Promise<number> {
      const response = await apiRequest<Subject>('/subjects.php', {
        method: 'POST',
        body: JSON.stringify(subject),
      });
      return response.id || 0;
    },
  },

  // Cadernos
  notebooks: {
    async getAll(filters?: { course_id?: number; subject_id?: number }): Promise<Notebook[]> {
      const params = new URLSearchParams();
      if (filters?.course_id) params.append('course_id', filters.course_id.toString());
      if (filters?.subject_id) params.append('subject_id', filters.subject_id.toString());

      const query = params.toString() ? `?${params}` : '';
      const response = await apiRequest<Notebook>(`/notebooks.php${query}`);
      return response.items || [];
    },

    async create(notebook: { title: string; color?: string; subject_id?: number }): Promise<number> {
      const response = await apiRequest<Notebook>('/notebooks.php', {
        method: 'POST',
        body: JSON.stringify(notebook),
      });
      return response.id || 0;
    },

    async update(id: number, updates: Partial<Notebook>): Promise<boolean> {
      const response = await apiRequest<Notebook>(`/notebooks.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response.success;
    },

    async delete(id: number): Promise<boolean> {
      const response = await apiRequest<Notebook>(`/notebooks.php?id=${id}`, {
        method: 'DELETE',
      });
      return response.success;
    },
  },

  // Páginas de caderno
  pages: {
    async getAll(notebookId: number): Promise<NotebookPage[]> {
      const response = await apiRequest<NotebookPage>(`/notebook_pages.php?notebook_id=${notebookId}`);
      return response.items || [];
    },

    async create(page: {
      notebook_id: number;
      title: string;
      content: string;
      color?: string
    }): Promise<number> {
      const response = await apiRequest<NotebookPage>('/notebook_pages.php', {
        method: 'POST',
        body: JSON.stringify(page),
      });
      return response.id || 0;
    },

    async update(id: number, updates: Partial<NotebookPage>): Promise<boolean> {
      const response = await apiRequest<NotebookPage>(`/notebook_pages.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response.success;
    },

    async delete(id: number): Promise<boolean> {
      const response = await apiRequest<NotebookPage>(`/notebook_pages.php?id=${id}`, {
        method: 'DELETE',
      });
      return response.success;
    },
  },
};
