export type AnalyticsDayMetric = {
  date: string;
  views: number;
  visitors: number;
  postViews: number;
};

export type AnalyticsTopPost = {
  slug: string;
  title: string;
  views: number;
  visitors: number;
  comments: number;
};

export type AnalyticsOverview = {
  days: number;
  startDate: string;
  endDate: string;
  totals: {
    views: number;
    visitors: number;
    postViews: number;
  };
  today: AnalyticsDayMetric;
  yesterday: AnalyticsDayMetric;
  daily: AnalyticsDayMetric[];
  topPosts: AnalyticsTopPost[];
};
