import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'bomba_nav2'

setup(
    name=package_name,
    version='0.1.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.launch.py')),
        (os.path.join('share', package_name, 'config'), glob('config/*.yaml')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Bomba Dev',
    maintainer_email='developer@example.com',
    description='ROS2 Humble bringup, SLAM mapping, and Nav2 navigation stack for Bomba Dashboard',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'telemetry_publisher = bomba_nav2.telemetry_publisher:main',
            'path_relay = bomba_nav2.path_relay:main',
        ],
    },
)

