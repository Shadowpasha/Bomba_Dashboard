import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    pkg_bomba_nav2 = get_package_share_directory('bomba_nav2')
    pkg_nav2_bringup = get_package_share_directory('nav2_bringup')
    pkg_slam_toolbox = get_package_share_directory('slam_toolbox')

    # Config file paths
    nav2_params_file = os.path.join(pkg_bomba_nav2, 'config', 'nav2_params.yaml')
    slam_params_file = os.path.join(pkg_bomba_nav2, 'config', 'slam_toolbox_params.yaml')
    ekf_params_file = os.path.join(pkg_bomba_nav2, 'config', 'ekf.yaml')

    use_sim_time = LaunchConfiguration('use_sim_time', default='false')

    # 1. Rosbridge WebSocket Server on port 9090
    rosbridge_node = Node(
        package='rosbridge_server',
        executable='rosbridge_websocket',
        name='rosbridge_websocket',
        output='screen',
        parameters=[{
            'port': 9090,
            'address': '0.0.0.0'
        }]
    )

    # 2. Robot Localization (EKF)
    ekf_node = Node(
        package='robot_localization',
        executable='ekf_node',
        name='ekf_filter_node',
        output='screen',
        parameters=[ekf_params_file, {'use_sim_time': use_sim_time}],
        remappings=[
            ('odometry/filtered', '/odom_filtered')
        ]
    )

    # 3. Static TF publisher for Lidar sensor
    tf_base_to_laser = Node(
        package='tf2_ros',
        executable='static_transform_publisher',
        name='base_to_laser_broadcaster',
        arguments=['0.12', '0', '0.18', '0', '0', '0', 'base_link', 'laser_frame']
    )

    # 4. SLAM Toolbox (Replaces legacy ROS1 Gmapping)
    slam_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(pkg_slam_toolbox, 'launch', 'online_async_launch.py')
        ),
        launch_arguments={
            'use_sim_time': use_sim_time,
            'slam_params_file': slam_params_file
        }.items()
    )

    # 5. Nav2 Navigation Stack
    nav2_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(pkg_nav2_bringup, 'launch', 'navigation_launch.py')
        ),
        launch_arguments={
            'use_sim_time': use_sim_time,
            'params_file': nav2_params_file,
            'autostart': 'true'
        }.items()
    )

    # 6. Bomba Dashboard Helper Relays
    telemetry_node = Node(
        package='bomba_nav2',
        executable='telemetry_publisher',
        name='bomba_telemetry_publisher',
        output='screen'
    )

    path_relay_node = Node(
        package='bomba_nav2',
        executable='path_relay',
        name='bomba_path_relay',
        output='screen'
    )

    return LaunchDescription([
        DeclareLaunchArgument('use_sim_time', default_value='false', description='Use simulation clock'),
        rosbridge_node,
        ekf_node,
        tf_base_to_laser,
        slam_launch,
        nav2_launch,
        telemetry_node,
        path_relay_node
    ])

