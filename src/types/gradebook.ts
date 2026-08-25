export interface GradebookAssessment {
  assessment: number
  name: string
  mark: number | string | null
  max_mark: number | string
  percentage: number | string | null
  weight: number | string
}

export interface GradebookStudent {
  enrollment: number
  student: number
  student_number: string
  first_name: string
  last_name: string
  assessments: GradebookAssessment[]
  course_percentage: number | string | null
}

export interface Gradebook {
  course: number
  students: GradebookStudent[]
}
