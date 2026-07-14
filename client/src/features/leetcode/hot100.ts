import type { Difficulty } from '@autumn-recruitment/shared'

export const HOT_100_LIST_ID = 'hot-100'

export const HOT_100_TOPICS = [
  '哈希', '双指针', '滑动窗口', '子串', '普通数组', '矩阵', '链表', '二叉树',
  '图论', '回溯', '二分查找', '栈', '堆', '贪心', '动态规划', '多维动态规划', '技巧',
] as const

export type LeetCodeTopic = (typeof HOT_100_TOPICS)[number]

export interface Hot100Problem {
  number: number
  slug: string
  title: string
  difficulty: Difficulty
  tags: string[]
  topic: LeetCodeTopic
  recommendedOrder: number
  url: string
}

type ProblemTuple = readonly [number, string, string, Difficulty, readonly string[]]

const GROUPS: ReadonlyArray<readonly [LeetCodeTopic, readonly ProblemTuple[]]> = [
  ['哈希', [
    [1, 'two-sum', '两数之和', 'easy', ['数组', '哈希表']],
    [49, 'group-anagrams', '字母异位词分组', 'medium', ['数组', '哈希表', '字符串']],
    [128, 'longest-consecutive-sequence', '最长连续序列', 'medium', ['数组', '哈希表']],
  ]],
  ['双指针', [
    [283, 'move-zeroes', '移动零', 'easy', ['数组']],
    [11, 'container-with-most-water', '盛最多水的容器', 'medium', ['数组', '贪心']],
    [15, '3sum', '三数之和', 'medium', ['数组', '排序']],
    [42, 'trapping-rain-water', '接雨水', 'hard', ['栈', '数组']],
  ]],
  ['滑动窗口', [
    [3, 'longest-substring-without-repeating-characters', '无重复字符的最长子串', 'medium', ['字符串', '哈希表']],
    [438, 'find-all-anagrams-in-a-string', '找到字符串中所有字母异位词', 'medium', ['字符串', '哈希表']],
  ]],
  ['子串', [
    [560, 'subarray-sum-equals-k', '和为 K 的子数组', 'medium', ['数组', '前缀和']],
    [239, 'sliding-window-maximum', '滑动窗口最大值', 'hard', ['队列', '单调队列']],
    [76, 'minimum-window-substring', '最小覆盖子串', 'hard', ['字符串', '哈希表']],
  ]],
  ['普通数组', [
    [53, 'maximum-subarray', '最大子数组和', 'medium', ['数组', '动态规划']],
    [56, 'merge-intervals', '合并区间', 'medium', ['数组', '排序']],
    [189, 'rotate-array', '轮转数组', 'medium', ['数组', '数学']],
    [238, 'product-of-array-except-self', '除自身以外数组的乘积', 'medium', ['数组', '前缀积']],
    [41, 'first-missing-positive', '缺失的第一个正数', 'hard', ['数组', '哈希表']],
  ]],
  ['矩阵', [
    [73, 'set-matrix-zeroes', '矩阵置零', 'medium', ['数组']],
    [54, 'spiral-matrix', '螺旋矩阵', 'medium', ['数组', '模拟']],
    [48, 'rotate-image', '旋转图像', 'medium', ['数组', '数学']],
    [240, 'search-a-2d-matrix-ii', '搜索二维矩阵 II', 'medium', ['数组', '二分查找']],
  ]],
  ['链表', [
    [160, 'intersection-of-two-linked-lists', '相交链表', 'easy', ['链表', '双指针']],
    [206, 'reverse-linked-list', '反转链表', 'easy', ['链表', '递归']],
    [234, 'palindrome-linked-list', '回文链表', 'easy', ['链表', '双指针']],
    [141, 'linked-list-cycle', '环形链表', 'easy', ['链表', '双指针']],
    [142, 'linked-list-cycle-ii', '环形链表 II', 'medium', ['链表', '双指针']],
    [21, 'merge-two-sorted-lists', '合并两个有序链表', 'easy', ['链表', '递归']],
    [2, 'add-two-numbers', '两数相加', 'medium', ['链表', '数学']],
    [19, 'remove-nth-node-from-end-of-list', '删除链表的倒数第 N 个结点', 'medium', ['链表', '双指针']],
    [24, 'swap-nodes-in-pairs', '两两交换链表中的节点', 'medium', ['链表', '递归']],
    [25, 'reverse-nodes-in-k-group', 'K 个一组翻转链表', 'hard', ['链表', '递归']],
    [138, 'copy-list-with-random-pointer', '随机链表的复制', 'medium', ['链表', '哈希表']],
    [148, 'sort-list', '排序链表', 'medium', ['链表', '归并排序']],
    [23, 'merge-k-sorted-lists', '合并 K 个升序链表', 'hard', ['链表', '堆']],
    [146, 'lru-cache', 'LRU 缓存', 'medium', ['链表', '哈希表']],
  ]],
  ['二叉树', [
    [94, 'binary-tree-inorder-traversal', '二叉树的中序遍历', 'easy', ['树', '深度优先搜索']],
    [104, 'maximum-depth-of-binary-tree', '二叉树的最大深度', 'easy', ['树', '深度优先搜索']],
    [226, 'invert-binary-tree', '翻转二叉树', 'easy', ['树', '广度优先搜索']],
    [101, 'symmetric-tree', '对称二叉树', 'easy', ['树', '递归']],
    [543, 'diameter-of-binary-tree', '二叉树的直径', 'easy', ['树', '深度优先搜索']],
    [102, 'binary-tree-level-order-traversal', '二叉树的层序遍历', 'medium', ['树', '广度优先搜索']],
    [108, 'convert-sorted-array-to-binary-search-tree', '将有序数组转换为二叉搜索树', 'easy', ['树', '分治']],
    [98, 'validate-binary-search-tree', '验证二叉搜索树', 'medium', ['树', '深度优先搜索']],
    [230, 'kth-smallest-element-in-a-bst', '二叉搜索树中第 K 小的元素', 'medium', ['树', '中序遍历']],
    [199, 'binary-tree-right-side-view', '二叉树的右视图', 'medium', ['树', '广度优先搜索']],
    [114, 'flatten-binary-tree-to-linked-list', '二叉树展开为链表', 'medium', ['树', '深度优先搜索']],
    [105, 'construct-binary-tree-from-preorder-and-inorder-traversal', '从前序与中序遍历序列构造二叉树', 'medium', ['树', '分治']],
    [437, 'path-sum-iii', '路径总和 III', 'medium', ['树', '前缀和']],
    [236, 'lowest-common-ancestor-of-a-binary-tree', '二叉树的最近公共祖先', 'medium', ['树', '深度优先搜索']],
    [124, 'binary-tree-maximum-path-sum', '二叉树中的最大路径和', 'hard', ['树', '动态规划']],
  ]],
  ['图论', [
    [200, 'number-of-islands', '岛屿数量', 'medium', ['图', '深度优先搜索']],
    [994, 'rotting-oranges', '腐烂的橘子', 'medium', ['图', '广度优先搜索']],
    [207, 'course-schedule', '课程表', 'medium', ['图', '拓扑排序']],
    [208, 'implement-trie-prefix-tree', '实现 Trie（前缀树）', 'medium', ['字典树', '设计']],
  ]],
  ['回溯', [
    [46, 'permutations', '全排列', 'medium', ['数组', '回溯']],
    [78, 'subsets', '子集', 'medium', ['数组', '回溯']],
    [17, 'letter-combinations-of-a-phone-number', '电话号码的字母组合', 'medium', ['字符串', '回溯']],
    [39, 'combination-sum', '组合总和', 'medium', ['数组', '回溯']],
    [22, 'generate-parentheses', '括号生成', 'medium', ['字符串', '回溯']],
    [79, 'word-search', '单词搜索', 'medium', ['矩阵', '回溯']],
    [131, 'palindrome-partitioning', '分割回文串', 'medium', ['字符串', '回溯']],
    [51, 'n-queens', 'N 皇后', 'hard', ['数组', '回溯']],
  ]],
  ['二分查找', [
    [35, 'search-insert-position', '搜索插入位置', 'easy', ['数组', '二分查找']],
    [74, 'search-a-2d-matrix', '搜索二维矩阵', 'medium', ['数组', '二分查找']],
    [34, 'find-first-and-last-position-of-element-in-sorted-array', '在排序数组中查找元素的第一个和最后一个位置', 'medium', ['数组', '二分查找']],
    [33, 'search-in-rotated-sorted-array', '搜索旋转排序数组', 'medium', ['数组', '二分查找']],
    [153, 'find-minimum-in-rotated-sorted-array', '寻找旋转排序数组中的最小值', 'medium', ['数组', '二分查找']],
    [4, 'median-of-two-sorted-arrays', '寻找两个正序数组的中位数', 'hard', ['数组', '分治']],
  ]],
  ['栈', [
    [20, 'valid-parentheses', '有效的括号', 'easy', ['字符串', '栈']],
    [155, 'min-stack', '最小栈', 'medium', ['设计', '栈']],
    [394, 'decode-string', '字符串解码', 'medium', ['字符串', '栈']],
    [739, 'daily-temperatures', '每日温度', 'medium', ['数组', '单调栈']],
    [84, 'largest-rectangle-in-histogram', '柱状图中最大的矩形', 'hard', ['数组', '单调栈']],
  ]],
  ['堆', [
    [215, 'kth-largest-element-in-an-array', '数组中的第 K 个最大元素', 'medium', ['数组', '堆']],
    [347, 'top-k-frequent-elements', '前 K 个高频元素', 'medium', ['数组', '堆']],
    [295, 'find-median-from-data-stream', '数据流的中位数', 'hard', ['设计', '堆']],
  ]],
  ['贪心', [
    [121, 'best-time-to-buy-and-sell-stock', '买卖股票的最佳时机', 'easy', ['数组', '动态规划']],
    [55, 'jump-game', '跳跃游戏', 'medium', ['数组', '贪心']],
    [45, 'jump-game-ii', '跳跃游戏 II', 'medium', ['数组', '贪心']],
    [763, 'partition-labels', '划分字母区间', 'medium', ['字符串', '贪心']],
  ]],
  ['动态规划', [
    [70, 'climbing-stairs', '爬楼梯', 'easy', ['数学', '动态规划']],
    [118, 'pascals-triangle', '杨辉三角', 'easy', ['数组', '动态规划']],
    [198, 'house-robber', '打家劫舍', 'medium', ['数组', '动态规划']],
    [279, 'perfect-squares', '完全平方数', 'medium', ['数学', '动态规划']],
    [322, 'coin-change', '零钱兑换', 'medium', ['数组', '动态规划']],
    [139, 'word-break', '单词拆分', 'medium', ['字符串', '动态规划']],
    [300, 'longest-increasing-subsequence', '最长递增子序列', 'medium', ['数组', '动态规划']],
    [152, 'maximum-product-subarray', '乘积最大子数组', 'medium', ['数组', '动态规划']],
    [416, 'partition-equal-subset-sum', '分割等和子集', 'medium', ['数组', '动态规划']],
    [32, 'longest-valid-parentheses', '最长有效括号', 'hard', ['字符串', '动态规划']],
  ]],
  ['多维动态规划', [
    [62, 'unique-paths', '不同路径', 'medium', ['数学', '动态规划']],
    [64, 'minimum-path-sum', '最小路径和', 'medium', ['矩阵', '动态规划']],
    [5, 'longest-palindromic-substring', '最长回文子串', 'medium', ['字符串', '动态规划']],
    [1143, 'longest-common-subsequence', '最长公共子序列', 'medium', ['字符串', '动态规划']],
    [72, 'edit-distance', '编辑距离', 'medium', ['字符串', '动态规划']],
  ]],
  ['技巧', [
    [136, 'single-number', '只出现一次的数字', 'easy', ['数组', '位运算']],
    [169, 'majority-element', '多数元素', 'easy', ['数组', '计数']],
    [75, 'sort-colors', '颜色分类', 'medium', ['数组', '排序']],
    [31, 'next-permutation', '下一个排列', 'medium', ['数组', '双指针']],
    [287, 'find-the-duplicate-number', '寻找重复数', 'medium', ['数组', '双指针']],
  ]],
]

export const HOT_100_PROBLEMS: Hot100Problem[] = GROUPS.flatMap(([topic, problems]) =>
  problems.map(([number, slug, title, difficulty, tags]) => ({
    number,
    slug,
    title,
    difficulty,
    tags: Array.from(new Set([topic, ...tags])),
    topic,
    recommendedOrder: 0,
    url: `https://leetcode.cn/problems/${slug}/`,
  })),
).map((problem, index) => ({ ...problem, recommendedOrder: index + 1 }))
