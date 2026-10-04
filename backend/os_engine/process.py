class Process:
    def __init__(
        self,
        process_id,
        arrival_time,
        burst_time,
        priority=0
    ):
        self.process_id = process_id
        self.arrival_time = arrival_time
        self.burst_time = burst_time
        self.priority = priority

        # Process state
        self.state = "NEW"

        # Scheduling information
        self.remaining_time = burst_time
        self.start_time = None
        self.completion_time = None

        # Performance metrics
        self.waiting_time = 0
        self.turnaround_time = 0
        self.response_time = 0

    def __repr__(self):
        return (
            f"Process("
            f"PID={self.process_id}, "
            f"Arrival={self.arrival_time}, "
            f"Burst={self.burst_time}, "
            f"Priority={self.priority}, "
            f"State={self.state}"
            f")"
        )