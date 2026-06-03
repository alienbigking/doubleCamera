module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    semi: ['error', 'never'], // 禁止使用分号
    '@typescript-eslint/no-unused-vars': [
      'warn', // 改成 warn，避免报错阻塞
      {
        varsIgnorePattern: '^_', // 变量名以 _ 开头的忽略
        argsIgnorePattern: '^_', // 函数参数名以 _ 开头的忽略
      },
    ],
  },
}
