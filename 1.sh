#!/bin/bash

# 生成数学题的函数
generate_math_problem() {
  # 获取当前UTC时间的小时、分钟、秒
  hour=$(date -u +"%H")
  minute=$(date -u +"%M")
  second=$(date -u +"%S")
  
  # 随机生成一个运算符（加、减、乘）
  case $((RANDOM % 3)) in
    0) operator="+" ;;
    1) operator="-" ;;
    2) operator="*" ;;
  esac

  # 根据小时、分钟和秒生成两个操作数
  num1=$((hour + 1))  # 基于小时的加法，确保不为零
  num2=$((minute + 2))  # 基于分钟的加法，确保不为零

  # 生成数学题
  problem="$num1 $operator $num2 = ?"

  # 计算答案
  case $operator in
    "+") answer=$((num1 + num2)) ;;
    "-") answer=$((num1 - num2)) ;;
    "*") answer=$((num1 * num2)) ;;
  esac

  # 返回题目和答案
  echo "$problem 答案是: $answer"
}

# 每5分钟生成一次题目
while true
do
  # 获取当前的UTC时间
  current_time=$(date -u +"%Y-%m-%d %H:%M:%S")
  
  # 生成数学题
  problem=$(generate_math_problem)

  # 将题目和答案写入日志文件
  echo "$current_time - $problem" >> /root/math_problems.log
  
  # 等待5分钟
  sleep 300
done