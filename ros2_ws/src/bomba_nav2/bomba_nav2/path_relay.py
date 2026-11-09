import rclpy
from rclpy.node import Node
from nav_msgs.msg import Path
from geometry_msgs.msg import PoseStamped


class PathRelay(Node):
    def __init__(self):
        super().__init__('bomba_path_relay')

        # Relay Nav2 global plan to dashboard planned_path topic
        self.path_sub = self.create_subscription(
            Path,
            '/plan',
            self.plan_callback,
            10
        )
        self.path_pub = self.create_publisher(Path, '/planned_path', 10)

        # Relay legacy move_base goals to Nav2 goal_pose
        self.legacy_goal_sub = self.create_subscription(
            PoseStamped,
            '/move_base_simple/goal',
            self.legacy_goal_callback,
            10
        )
        self.goal_pub = self.create_publisher(PoseStamped, '/goal_pose', 10)

        self.get_logger().info('Bomba Path and Goal relay initialized.')

    def plan_callback(self, msg: Path):
        self.path_pub.publish(msg)

    def legacy_goal_callback(self, msg: PoseStamped):
        self.goal_pub.publish(msg)


def main(args=None):
    rclpy.init(args=args)
    node = PathRelay()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()

