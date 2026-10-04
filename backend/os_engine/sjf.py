from .scheduler import Scheduler


class SJFScheduler(Scheduler):

    def schedule(self, processes):

        # Make a copy so we don't modify the original list
        remaining_processes = processes.copy()

        scheduled_processes = []

        current_time = 0

        while remaining_processes:

            # Find processes that have already arrived
            available_processes = [
                process
                for process in remaining_processes
                if process.arrival_time <= current_time
            ]

            # If no process has arrived yet, move time forward
            if not available_processes:
                current_time = min(
                    process.arrival_time
                    for process in remaining_processes
                )
                continue

            # Choose the process with the shortest burst time
            process = min(
                available_processes,
                key=lambda p: p.burst_time
            )

            process.state = "RUNNING"

            process.start_time = current_time

            # Response time
            process.response_time = (
                process.start_time - process.arrival_time
            )

            # Execute the process
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

            scheduled_processes.append(process)

            remaining_processes.remove(process)

        return scheduled_processes