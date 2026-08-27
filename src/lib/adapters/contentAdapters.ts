interface ExpertAdapterInput {
  id: string;
  user_id?: string;
  nickname?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  title?: string | null;
  bio?: string | null;
  description?: string | null;
  tags?: unknown;
  keywords?: unknown;
  category?: string | null;
  rating?: number | string | null;
  response_rate?: number | null;
  responseRate?: string | null;
  order_count?: number | null;
  orderCount?: string | null;
  consultation_price?: number | null;
  consultationPrice?: number | null;
  location?: string | null;
  education?: unknown;
  experience?: unknown;
  is_verified?: boolean | null;
  verified?: boolean | null;
}

interface QuestionAdapterInput {
  id: string;
  title?: string | null;
  content?: string | null;
  tags?: unknown;
  bounty_points?: number | null;
  bountyPoints?: number | null;
  view_count?: number | null;
  viewCount?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
  profile_nickname?: string | null;
  askerName?: string | null;
  profile_avatar?: string | null;
  askerAvatar?: string | null;
  answers_count?: number | null;
  answersCount?: number | null;
  category?: string | null;
}

interface ConversationAdapterInput {
  id?: string;
  partner_id?: string;
  partnerId?: string;
  partner_nickname?: string | null;
  partnerNickname?: string | null;
  partner_avatar?: string | null;
  partnerAvatar?: string | null;
  last_message?: string | null;
  lastMessage?: string | null;
  last_message_time?: string | null;
  lastMessageTime?: string | null;
  unread_count?: number | null;
  unreadCount?: number | null;
}

export interface UIExpertCardModel {
  id: string;
  name: string;
  avatar: string | null;
  title: string;
  description: string;
  tags: string[];
  keywords: string[];
  category: string | null;
  rating: number | null;
  responseRate: string | null;
  orderCount: string | null;
  consultationPrice: number | null;
  location: string | null;
  education: string[];
  experience: string[];
  verified: boolean | null;
}

export interface UIQuestionModel {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  bountyPoints: number | null;
  viewCount: number | null;
  createdAt: string | null;
  askerName: string;
  askerAvatar: string | null;
  answersCount: number | null;
  category?: string | null;
}

export interface UIConversationModel {
  id: string;
  partnerId: string;
  partnerNickname: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number | null;
}

const firstPresent = (...values: unknown[]) =>
  values.find((value) => value !== null && value !== undefined);

const toNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const organization = toNullableString(obj.school) || toNullableString(obj.company) || '';
        const role = toNullableString(obj.degree) || toNullableString(obj.position) || toNullableString(obj.title) || '';
        return `${organization} ${role}`.trim();
      }
      return '';
    })
    .filter((item) => item.length > 0);
};

export const mapExpertToUIModel = (expert: ExpertAdapterInput, options?: { categoryFallback?: string }): UIExpertCardModel => ({
  id: expert.id,
  name: expert.nickname || expert.name || '专家',
  avatar: toNullableString(firstPresent(expert.avatar_url, expert.avatar)),
  title: expert.title || '',
  description: expert.bio || expert.description || '',
  tags: toStringArray(expert.tags),
  keywords: toStringArray(expert.keywords),
  category: expert.category || options?.categoryFallback || null,
  rating: toNullableNumber(expert.rating),
  responseRate: typeof expert.response_rate === 'number'
    ? `${expert.response_rate}%`
    : toNullableString(expert.responseRate),
  orderCount: typeof expert.order_count === 'number'
    ? `${expert.order_count}单`
    : toNullableString(expert.orderCount),
  consultationPrice: toNullableNumber(firstPresent(expert.consultation_price, expert.consultationPrice)),
  location: toNullableString(expert.location),
  education: toStringArray(expert.education),
  experience: toStringArray(expert.experience),
  verified: toNullableBoolean(firstPresent(expert.is_verified, expert.verified)),
});

export const mapQuestionToUIModel = (question: QuestionAdapterInput): UIQuestionModel => ({
  id: question.id,
  title: question.title || '',
  content: question.content || null,
  tags: toStringArray(question.tags),
  bountyPoints: toNullableNumber(firstPresent(question.bounty_points, question.bountyPoints)),
  viewCount: toNullableNumber(firstPresent(question.view_count, question.viewCount)),
  createdAt: toNullableString(firstPresent(question.created_at, question.createdAt)),
  askerName: question.profile_nickname || question.askerName || '匿名用户',
  askerAvatar: toNullableString(firstPresent(question.profile_avatar, question.askerAvatar)),
  answersCount: toNullableNumber(firstPresent(question.answers_count, question.answersCount)),
  category: question.category || null,
});

export const mergeUniqueById = <T extends { id: string }>(primary: T[], fallback: T[]) => {
  const merged = [...primary, ...fallback];
  return merged.filter((item, index) => merged.findIndex((target) => target.id === item.id) === index);
};

export const mapConversationToUIModel = (conversation: ConversationAdapterInput): UIConversationModel => ({
  id: toNullableString(firstPresent(conversation.partner_id, conversation.partnerId, conversation.id)) || '',
  partnerId: toNullableString(firstPresent(conversation.partner_id, conversation.partnerId, conversation.id)) || '',
  partnerNickname: toNullableString(firstPresent(conversation.partner_nickname, conversation.partnerNickname)) || '用户',
  partnerAvatar: toNullableString(firstPresent(conversation.partner_avatar, conversation.partnerAvatar)),
  lastMessage: toNullableString(firstPresent(conversation.last_message, conversation.lastMessage)) || '暂无消息内容',
  lastMessageTime: toNullableString(firstPresent(conversation.last_message_time, conversation.lastMessageTime)),
  unreadCount: toNullableNumber(firstPresent(conversation.unread_count, conversation.unreadCount)),
});

export const filterExpertsByCategory = (experts: UIExpertCardModel[], activeCategory: string) => {
  if (activeCategory === 'all') return experts;
  return experts.filter((item) => item.category === activeCategory || item.category === 'all');
};

export const mapDemoExpertsByChannel = (
  experts: ExpertAdapterInput[],
  channelCategory: string,
  options?: { categoryFallback?: string }
) => {
  return experts
    .filter((item) => item.category === channelCategory)
    .map((item) => mapExpertToUIModel(item, { categoryFallback: options?.categoryFallback }));
};

const CHANNEL_KEYWORDS: Record<string, string[]> = {
  'education-learning': ['高考', '考研', '留学', '论文', '申请', '雅思', '托福', '择校', '升学', '学术'],
  'career-development': ['求职', '简历', '面试', '职业', '校招', '跳槽', '远程', '创业', 'offer'],
  'lifestyle-services': ['租房', '法律', '情感', '保险', '海外生活', '维权', '合同', '理赔'],
  'hobbies-skills': ['摄影', '音乐', '艺术', '健身', '烹饪', '创作', '兴趣', '技能'],
};

const normalizeChannel = (value: string | null | undefined) => {
  if (!value) return '';
  const input = value.trim();
  const map: Record<string, string> = {
    教育学习: 'education-learning',
    职业发展: 'career-development',
    生活服务: 'lifestyle-services',
    兴趣技能: 'hobbies-skills',
    education: 'education-learning',
    career: 'career-development',
    lifestyle: 'lifestyle-services',
    hobbies: 'hobbies-skills',
  };
  return map[input] || input;
};

const questionTextBag = (item: QuestionAdapterInput) =>
  [item.title || '', item.content || '', ...(Array.isArray(item.tags) ? item.tags : [])].join(' ').toLowerCase();

export const mapDemoQuestionsByChannel = (questions: QuestionAdapterInput[], channelCategory: string) => {
  const normalized = normalizeChannel(channelCategory);
  const keywords = CHANNEL_KEYWORDS[normalized] || [];

  return questions
    .filter((item) => {
      const itemCategory = normalizeChannel(item.category || null);
      if (itemCategory && itemCategory === normalized) return true;
      if (!keywords.length) return false;
      const bag = questionTextBag(item);
      return keywords.some((keyword) => bag.includes(keyword.toLowerCase()));
    })
    .map((item) => mapQuestionToUIModel(item));
};

export const filterQuestionsByCategory = (
  questions: UIQuestionModel[],
  activeCategory: string,
  categoryKeywords: Record<string, string[]>
) => {
  if (activeCategory === 'all') return questions;
  const keywords = categoryKeywords[activeCategory] || [];
  if (keywords.length === 0) {
    return questions.filter((item) => item.category === activeCategory);
  }

  return questions.filter((item) => {
    if (item.category === activeCategory) return true;
    const bag = [item.title, item.content || '', ...(item.tags || [])].join(' ').toLowerCase();
    return keywords.some((keyword) => bag.includes(keyword.toLowerCase()));
  });
};

export const mapDemoQuestionsForSearch = (demoQuestions: QuestionAdapterInput[], normalizedQuery: string) => {
  return demoQuestions
    .filter((item) => {
      const bag = [item.title || '', item.content || '', ...toStringArray(item.tags)].join(' ').toLowerCase();
      return bag.includes(normalizedQuery);
    })
    .map((item) => {
      const tags = toStringArray(item.tags);
      return {
        ...item,
        tags,
        category: tags[0] || null,
      };
    });
};

export const mapDemoUsersForSearch = (demoExperts: ExpertAdapterInput[], normalizedQuery: string) => {
  return demoExperts
    .filter((item) => {
      const bag = [item.nickname || '', item.title || '', item.bio || '', ...toStringArray(item.tags)].join(' ').toLowerCase();
      return bag.includes(normalizedQuery);
    })
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      user_id: item.user_id,
      nickname: item.nickname,
      avatar_url: item.avatar_url,
      bio: item.bio,
    }));
};
