import type { Course } from "../types";

/**
 * Course is "upcoming" if its end_at is later than midnight of the day it ended.
 * Used by both public Schedule and admin homepage.
 *
 * Why: a course ending at 19:00 today should still appear all day (until midnight),
 * not vanish at 19:01.
 */
export function isCourseUpcoming(course: Course, now: Date = new Date()): boolean {
  const end = new Date(course.end_at);
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  return endOfDay > now;
}

/**
 * Filter and sort courses for the upcoming list.
 */
export function filterUpcomingCourses(courses: Course[], now: Date = new Date()): Course[] {
  return courses
    .filter((c) => isCourseUpcoming(c, now))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

/**
 * Course is enrollable retroactively if it started in the last 2 days.
 * Used by admin enrollment dropdown.
 */
export function isCourseEnrollable(course: Course, now: Date = new Date()): boolean {
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const start = new Date(course.start_at);
  return start >= twoDaysAgo;
}