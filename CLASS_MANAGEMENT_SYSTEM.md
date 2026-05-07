# Class Management System - Manual Classes Only

## Overview
The system now uses **ONLY manually created classes** as the source of truth. Classes must be created explicitly in the Class Configuration page before they can be used anywhere in the system.

## How It Works

### 1. Creating Classes
- Go to **Admin → Academics** (Class Configuration page)
- Click **"Add New Class"** button
- Enter:
  - **Class Name**: e.g., "Grade 7", "Grade 8", "Class 10"
  - **Section**: e.g., "A", "B", "C"
- Click **"Create Class"**
- The class is now available system-wide

### 2. Data Storage
- **Key**: `{schoolId}_school_classes`
- **Format**: Array of class objects
```json
[
  {
    "id": "grade-7-a",
    "name": "Grade 7 A",
    "section": "A",
    "inCharge": "Mr. Smith",
    "students": 0,
    "isManual": true
  }
]
```

### 3. Where Classes Are Used

#### Students Page
- Class and Section dropdowns load from manually created classes
- Students can only be assigned to existing classes
- Student count updates automatically when students are added

#### Attendance Page
- Class dropdown shows only manually created classes
- Sections filter based on selected class

#### Exams Page
- Exam scheduling uses manually created classes
- Marks entry filters by class and section

#### Analytics Page
- Performance reports filter by manually created classes
- Class averages calculated per class

#### Dashboard
- Class distribution chart shows manually created classes
- Statistics based on actual classes

## Helper Functions

### In `lib/school-context.tsx`:

```typescript
// Load all classes for a school
getSchoolClasses(schoolId: string): SchoolClass[]

// Get unique class names (e.g., ["Grade 7", "Grade 8"])
getUniqueClassNames(classes: SchoolClass[]): string[]

// Get unique sections (e.g., ["A", "B", "C"])
getUniqueSections(classes: SchoolClass[]): string[]
```

### Usage Example:
```typescript
import { useSchool, getSchoolClasses, getUniqueClassNames } from "@/lib/school-context";

const { currentSchool } = useSchool();
const classes = getSchoolClasses(currentSchool.id);
const classNames = getUniqueClassNames(classes);
```

## Benefits

1. **Centralized Control**: All classes managed in one place
2. **Data Consistency**: No duplicate or conflicting class data
3. **Validation**: Students can only be added to valid classes
4. **Flexibility**: Easy to add, edit, or remove classes
5. **Multi-Tenant Safe**: Each school has its own isolated class list

## Migration Notes

### Before (Old System):
- Classes were auto-generated from student data
- Hardcoded class options in dropdowns
- No central class management

### After (New System):
- Classes must be created manually first
- All dropdowns load from `school_classes`
- Centralized class management in Class Configuration

## Important Rules

1. **Create Classes First**: Before adding students, create the classes they'll be assigned to
2. **Cannot Delete Classes with Students**: Classes with enrolled students cannot be deleted
3. **School Isolation**: Each school's classes are completely separate
4. **Student Count Auto-Updates**: When students are added/removed, class student counts update automatically

## Workflow

```
1. Admin creates classes in Class Configuration
   ↓
2. Classes are saved to localStorage
   ↓
3. All pages load classes from localStorage
   ↓
4. Students/Attendance/Exams use these classes
   ↓
5. Student counts update automatically
```

## Files Updated

- ✅ `lib/school-context.tsx` - Added helper functions
- ✅ `components/admin/class-configuration.tsx` - Manual class creation only
- ✅ `app/(dashboard)/students/page.tsx` - Uses manually created classes
- 🔄 `app/(dashboard)/attendance/page.tsx` - Needs update
- 🔄 `app/(dashboard)/admin/exams/page.tsx` - Needs update
- 🔄 `app/(dashboard)/analytics/student-performance/page.tsx` - Needs update
- 🔄 `app/(dashboard)/dashboard/page.tsx` - Needs update

## Next Steps

To complete the system-wide implementation, update the remaining pages (marked with 🔄) to use the helper functions from `school-context.tsx` instead of hardcoded or auto-generated class lists.
