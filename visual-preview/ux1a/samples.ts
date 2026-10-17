import type { PublicPersonExperienceV1 } from '../../packages/shared-types/src/experience-v1';

// Authored design material only, never platform identities or API responses.
export const PREVIEW_REVISION = 'UX1A-R1';
export const questionTitle = '工作三年后想转行，如何判断该不该从零开始？';
export const questionContext = '我做了三年运营，最近开始接触用户研究。喜欢和人交流、梳理问题，但还不清楚自己是对新鲜感感兴趣，还是真的适合。希望听听经历过类似选择的人：当时用什么办法验证方向，又为转变做了哪些准备？';
export const longContext = `${questionContext}\n\n我尝试过在下班后学习，也主动参与了跨部门的小项目。现实的顾虑是：如果保持现在的工作，投入时间会很分散；如果直接辞职，又无法判断这段学习是否能支持下一步选择。我并不期待一句“勇敢转行”的答案，更想知道如何把大的决定拆成可以验证的小步骤。也欢迎分享那些最后没有转行、但重新理解了原有工作的人生经历。`;
export const longExperience = '先从每周一次访谈练习开始，再争取参与内部研究项目。前两个月我以为学会工具就足够，后来发现最难的是把问题问清楚、把自己的假设放在一边。我保留了每次访谈前后的记录，也向不同岗位的同事请教。这个过程没有立刻带来职位变化，却帮助我辨别了自己真正愿意长期做的事。\n\n一年后转入新团队，仍然有不适应的时候。我愿意分享的是当时如何安排学习、怎样争取项目机会，以及哪些尝试没有效果，而不是一条适用于所有人的职业路径。';
export const sampleExperience: PublicPersonExperienceV1 = {
  experienceId: 'ux1a-fictional-experience', personId: 'ux1a-fictional-person',
  title: '从运营转向用户研究的一年', description: longExperience,
  kind: 'work', visibility: 'public',
  timeRange: { startYear: 2022, startMonth: 6, endYear: 2023, endMonth: 7, isCurrent: false },
  location: null, canShare: ['低成本验证方向', '边工作边准备', '第一次项目复盘'],
  transitions: [{
    transitionId: 'ux1a-fictional-transition', experienceId: 'ux1a-fictional-experience', personId: 'ux1a-fictional-person',
    fromLabel: '运营岗位', toLabel: '用户研究岗位', occurredYear: 2023, occurredMonth: 7, sortOrder: 0,
  }],
  sortOrder: 0, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
};
