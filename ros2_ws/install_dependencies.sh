#!/bin/bash
set -e

echo "Updating APT packages..."
sudo apt-get update

echo "Installing ROS 2 Humble Nav2, SLAM Toolbox, EKF, and Rosbridge dependencies..."
sudo apt-get install -y \
  ros-humble-navigation2 \
  ros-humble-nav2-bringup \
  ros-humble-slam-toolbox \
  ros-humble-robot-localization \
  ros-humble-rosbridge-server \
  ros-humble-tf2-ros \
  python3-colcon-common-extensions

echo "All required ROS 2 Humble packages installed successfully."

