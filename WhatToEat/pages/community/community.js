/**
 * 社区动态页
 */
import { queryData, updateData, dbCollections } from '../../utils/db.js';
import { showToast, formatRelativeTime } from '../../utils/util.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    refreshing: false,
    loadingMore: false,
    posts: [], // 动态列表
    page: 1, // 当前页码
    pageSize: 10, // 每页数量
    hasMore: true, // 是否还有更多数据
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadPosts();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新列表
    this.refreshList();
  },

  /**
   * 加载动态列表
   */
  async loadPosts(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    if (reset) {
      this.setData({
        page: 1,
        posts: [],
        hasMore: true,
      });
    }

    this.setData({ 
      loading: reset,
      loadingMore: !reset,
    });

    try {
      const posts = await queryData(
        dbCollections.community,
        {},
        {
          orderBy: { field: 'createTime', order: 'desc' },
          limit: this.data.pageSize,
          skip: (this.data.page - 1) * this.data.pageSize,
        }
      );

      // 格式化时间
      const formattedPosts = posts.map(post => ({
        ...post,
        createTime: formatRelativeTime(post.createTime),
      }));

      this.setData({
        posts: reset ? formattedPosts : [...this.data.posts, ...formattedPosts],
        hasMore: posts.length === this.data.pageSize,
        page: this.data.page + 1,
      });
    } catch (err) {
      console.error('加载动态失败:', err);
      showToast('加载失败，请重试', 'none');
    } finally {
      this.setData({ 
        loading: false,
        loadingMore: false,
      });
    }
  },

  /**
   * 刷新列表
   */
  refreshList() {
    this.loadPosts(true);
  },

  /**
   * 下拉刷新
   */
  onRefresh() {
    this.setData({ refreshing: true });
    this.loadPosts(true).finally(() => {
      this.setData({ refreshing: false });
    });
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadPosts();
    }
  },

  /**
   * 动态点击
   */
  onPostTap(e) {
    const { post } = e.currentTarget.dataset;
    // 可以跳转到动态详情页
    console.log('点击动态:', post);
  },

  /**
   * 点赞
   */
  async onLike(e) {
    const { id, index } = e.currentTarget.dataset;
    const post = this.data.posts[index];

    try {
      // 更新点赞数
      await updateData(dbCollections.community, id, {
        likeCount: (post.likeCount || 0) + 1,
      });

      // 更新本地数据
      const posts = [...this.data.posts];
      posts[index].likeCount = (post.likeCount || 0) + 1;
      this.setData({ posts });

      showToast('点赞成功', 'success');
    } catch (err) {
      console.error('点赞失败:', err);
      showToast('操作失败', 'none');
    }
  },

  /**
   * 评论
   */
  onComment(e) {
    const { id } = e.currentTarget.dataset;
    // 可以跳转到评论页或显示评论弹窗
    console.log('评论:', id);
  },

  /**
   * 分享
   */
  onShare(e) {
    const { id } = e.currentTarget.dataset;
    // 调用微信分享功能
    wx.showShareMenu({
      withShareTicket: true,
    });
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls,
      current,
    });
  },

  /**
   * 导航到发布页
   */
  navigateToPublish() {
    // 可以跳转到发布动态页
    wx.showModal({
      title: '提示',
      content: '发布功能开发中...',
      showCancel: false,
    });
  },
});
