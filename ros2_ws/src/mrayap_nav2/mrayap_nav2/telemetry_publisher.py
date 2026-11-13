import math
import random
import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32


class TelemetryPublisher(Node):
    def __init__(self):
        super().__init__('mrayap_telemetry_publisher')

        self.methane_pub = self.create_publisher(Float32, '/sensor/methane', 10)
        self.flammable_pub = self.create_publisher(Float32, '/sensor/flammable', 10)
        self.air_quality_pub = self.create_publisher(Float32, '/sensor/air_quality', 10)

        self.timer = self.create_timer(1.0, self.publish_telemetry)

        self.base_methane = 42.0
        self.base_flammable = 2.4
        self.base_air_quality = 30.0
        self.step = 0

        self.get_logger().info('Mrayap telemetry publisher initialized.')

    def publish_telemetry(self):
        self.step += 1
        wave = math.sin(self.step * 0.1)

        methane_msg = Float32()
        methane_msg.data = float(round(self.base_methane + (wave * 3.0) + (random.uniform(-0.5, 0.5)), 2))
        self.methane_pub.publish(methane_msg)

        flammable_msg = Float32()
        flammable_msg.data = float(round(max(0.0, self.base_flammable + (wave * 0.4) + (random.uniform(-0.1, 0.1))), 2))
        self.flammable_pub.publish(flammable_msg)

        aqi_msg = Float32()
        aqi_msg.data = float(round(max(5.0, self.base_air_quality + (wave * 4.0) + (random.uniform(-1.0, 1.0))), 1))
        self.air_quality_pub.publish(aqi_msg)


def main(args=None):
    rclpy.init(args=args)
    node = TelemetryPublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()

