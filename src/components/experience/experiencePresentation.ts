import type {
  ExperienceKindV1,
  ExperienceTimeRangeV1,
} from '../../../packages/shared-types/src/experience-v1';

export const EXPERIENCE_KIND_LABELS: Record<ExperienceKindV1, string> = {
  education: '学习经历',
  work: '工作经历',
  project: '项目经历',
  life: '生活经历',
  skill: '技能经历',
  journey: '人生阶段 / 转变',
  other: '其他经历',
};

const formatYearMonth = (year: number | null, month: number | null) => {
  if (year === null) return null;
  return month === null ? `${year}` : `${year}.${String(month).padStart(2, '0')}`;
};

export const formatExperienceTimeRange = (timeRange: ExperienceTimeRangeV1) => {
  const start = formatYearMonth(timeRange.startYear, timeRange.startMonth);
  const end = timeRange.isCurrent
    ? '至今'
    : formatYearMonth(timeRange.endYear, timeRange.endMonth);

  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return timeRange.isCurrent ? end : `截至 ${end}`;
  return null;
};

export const formatTransitionTime = (year: number | null, month: number | null) => {
  if (year === null) return null;
  return month === null ? `${year}` : `${year}.${String(month).padStart(2, '0')}`;
};
