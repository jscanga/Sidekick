import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { canvasUrl, canvasApiKey, includeGrades = false } = await request.json();
    
    if (!canvasUrl || !canvasApiKey) {
      return NextResponse.json(
        { error: 'Canvas URL and API key are required' },
        { status: 400 }
      );
    }

    let apiUrl = canvasUrl.trim();
    if (!apiUrl.startsWith('http')) {
      apiUrl = `https://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/$/, '');

    console.log('Fetching from Canvas API');

    // Get all enrolled courses
    const courses = await fetchEnrolledCourses(apiUrl, canvasApiKey);
    console.log(`Found ${courses.length} courses`);
    
    let allAssignments: any[] = [];
    let courseGrades: any[] = [];
    
    for (const course of courses) {
      try {
        // Fetch assignments
        const courseAssignments = await fetchCourseAssignments(apiUrl, canvasApiKey, course.id);
        console.log(`Found ${courseAssignments.length} assignments for course: ${course.name}`);
        
        const assignmentsWithStatus = await checkAssignmentSubmissions(apiUrl, canvasApiKey, course.id, courseAssignments);
        
        allAssignments = allAssignments.concat(assignmentsWithStatus.map((assignment: any) => ({
          ...assignment,
          course_name: course.name,
          course_id: course.id
        })));

        // Fetch grades if requested
        if (includeGrades) {
          const gradeInfo = await fetchCourseGrades(apiUrl, canvasApiKey, course.id);
          if (gradeInfo) {
            courseGrades.push({
              course_id: course.id,
              course_name: course.name,
              ...gradeInfo
            });
          }
        }
        
      } catch (error) {
        console.error(`Error processing course ${course.name}:`, error);
      }
    }

    console.log('Total assignments found:', allAssignments.length);
    
    const incompleteAssignments = allAssignments.filter(assignment => !assignment.completed);
    console.log('Incomplete assignments:', incompleteAssignments.length);
    
    // Return both assignments and grades
    const responseData: any = {
      assignments: incompleteAssignments,
      success: true
    };

    if (includeGrades) {
      responseData.grades = courseGrades;
    }
    
    if (incompleteAssignments.length === 0 && !includeGrades) {
      return NextResponse.json(
        { error: 'No incomplete assignments found in your Canvas account' },
        { status: 404 }
      );
    }
    
    // Convert to ICS format for assignments only
    const icsData = convertAssignmentsToICS(incompleteAssignments);
    
    return new NextResponse(icsData, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar',
      },
    });
  } catch (error) {
    console.error('Canvas sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Canvas. Please check your URL and API key.' },
      { status: 500 }
    );
  }
}
async function fetchCourseGrades(apiUrl: string, apiKey: string, courseId: number): Promise<any> {
  const gradesUrl = `${apiUrl}/api/v1/courses/${courseId}/enrollments?` + 
    `per_page=100&` +
    `type[]=StudentEnrollment`;

  console.log('Fetching grades from:', gradesUrl);
  
  const response = await fetch(gradesUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch grades for course ${courseId}:`, response.status);
    return null;
  }

  const enrollments = await response.json();
  
  // Find the student's enrollment
  const studentEnrollment = enrollments.find((enrollment: any) => 
    enrollment.type === 'StudentEnrollment' && enrollment.enrollment_state === 'active'
  );
  
  return studentEnrollment ? {
    currentGrade: studentEnrollment.grades?.current_grade,
    currentScore: studentEnrollment.grades?.current_score,
    finalGrade: studentEnrollment.grades?.final_grade,
    finalScore: studentEnrollment.grades?.final_score,
    gradeScale: studentEnrollment.grades?.grading_scale || 'Percentage'
  } : null;
}
// Fetch all enrolled courses
async function fetchEnrolledCourses(apiUrl: string, apiKey: string): Promise<any[]> {
  const coursesUrl = `${apiUrl}/api/v1/courses?enrollment_state=active&per_page=100`;
  console.log('Fetching courses from:', coursesUrl);
  
  const response = await fetch(coursesUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status}`);
  }

  const courses = await response.json();
  // Filter out courses without a name (sometimes Canvas returns empty course objects)
  return courses.filter((course: any) => course.name && course.id);
}

// Fetch assignments for a specific course
async function fetchCourseAssignments(apiUrl: string, apiKey: string, courseId: number): Promise<any[]> {
  const assignmentsUrl = `${apiUrl}/api/v1/courses/${courseId}/assignments?` + 
    `per_page=100&` + // Get more results per page
    `order_by=due_at`; // Order by due date

  console.log('Fetching assignments from:', assignmentsUrl);
  
  const response = await fetch(assignmentsUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch assignments for course ${courseId}:`, response.status);
    return [];
  }

  const assignments = await response.json();
  return assignments;
}

// Check submission status for assignments
async function checkAssignmentSubmissions(apiUrl: string, apiKey: string, courseId: number, assignments: any[]): Promise<any[]> {
  const assignmentsWithStatus = [];
  
  for (const assignment of assignments) {
    try {
      // Check if assignment has been submitted
      const submissionUrl = `${apiUrl}/api/v1/courses/${courseId}/assignments/${assignment.id}/submissions/self`;
      const response = await fetch(submissionUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const submission = await response.json();
        // Mark as completed if submitted (workflow_state can be 'submitted', 'graded', 'pending_review')
        const isCompleted = submission.workflow_state !== 'unsubmitted' && submission.workflow_state !== null;
        
        assignmentsWithStatus.push({
          ...assignment,
          completed: isCompleted,
          submission_status: submission.workflow_state
        });
        
        console.log(`Assignment "${assignment.name}": ${submission.workflow_state} (completed: ${isCompleted})`);
      } else {
        // If we can't check submission status, assume it's not completed
        assignmentsWithStatus.push({
          ...assignment,
          completed: false,
          submission_status: 'unknown'
        });
        
        console.log(`Assignment "${assignment.name}": unknown status (assumed incomplete)`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`Error checking submission for assignment ${assignment.id}:`, error);
      assignmentsWithStatus.push({
        ...assignment,
        completed: false,
        submission_status: 'error'
      });
    }
  }
  
  return assignmentsWithStatus;
}

function convertAssignmentsToICS(assignments: any[]): string {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Canvas Todo Sync//EN',
  ];

  assignments.forEach((assignment) => {
    const dueDate = assignment.due_at;
    const assignmentName = assignment.name || 'Canvas Assignment';
    const courseName = assignment.course_name || 'Canvas Course';

    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const icsDate = formatICSDate(dueDateObj);
      
      // Clean up the course name - remove any leading numbers and spaces
      let cleanCourseName = courseName;
      
      // Remove any numbers followed by space at the beginning
      // This handles "2261 CS 0445..." -> "CS 0445..."
      const numberPattern = /^\d+\s+/;
      if (numberPattern.test(cleanCourseName)) {
        cleanCourseName = cleanCourseName.replace(numberPattern, '');
      }
      
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${assignment.id}@canvas`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${icsDate}`,
        `DTEND:${icsDate}`,
        `SUMMARY:${escapeICS(assignmentName)}`,
        `DESCRIPTION:${escapeICS(cleanCourseName)}`, // Only include the cleaned course name
        'END:VEVENT'
      );
    }
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
}

function escapeICS(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/<[^>]*>/g, ''); // Remove HTML tags
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}