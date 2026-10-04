from .scheduler import Scheduler


class PriorityScheduler(Scheduler):

    def schedule(self, processes):

        remaining_processes = processes.copy()
        scheduled_processes = []

        current_time = 0

        while remaining_processes:

            # Processes that have already arrived
            available_processes = [
                process
                for process in remaining_processes
                if process.arrival_time <= current_time
            ]

            # CPU remains idle until the next process arrives
            if not available_processes:
                current_time = min(
                    process.arrival_time
                    for process in remaining_processes
                )
                continue

            # Smaller priority number = higher priority
            process = min(
                available_processes,
                key=lambda p: p.priority
            )

            process.state = "RUNNING"

            process.start_time = current_time

            # Response time
            process.response_time = (
                process.start_time - process.arrival_time
            )

            # Execute process
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