from .scheduler import Scheduler


class FCFSScheduler(Scheduler):

    def schedule(self, processes):

        # FCFS: process with earlier arrival time runs first
        processes = sorted(
            processes,
            key=lambda process: process.arrival_time
        )

        current_time = 0

        for process in processes:

            # CPU is idle if the next process hasn't arrived yet
            if current_time < process.arrival_time:
                current_time = process.arrival_time

            process.state = "RUNNING"

            process.start_time = current_time

            # Response time
            process.response_time = (
                process.start_time - process.arrival_time
            )

            # Process executes
            current_time += process.burst_time

            process.remaining_time = 0

            process.completion_time = current_time

            process.state = "TERMINATED"

            # Turnaround time
            process.turnaround_time = (
                process.completion_time - process.arrival_time
            )

            # Waiting time
            process.waiting_time = (
                process.turnaround_time - process.burst_time
            )

        return processes