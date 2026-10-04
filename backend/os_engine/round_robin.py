from collections import deque

from .scheduler import Scheduler


class RoundRobinScheduler(Scheduler):

    def __init__(self, time_quantum):
        self.time_quantum = time_quantum

    def schedule(self, processes):

        if self.time_quantum <= 0:
            raise ValueError("Time quantum must be greater than 0.")

        # Reset scheduling-related values
        for process in processes:
            process.remaining_time = process.burst_time
            process.state = "NEW"
            process.start_time = None
            process.completion_time = None
            process.waiting_time = 0
            process.turnaround_time = 0
            process.response_time = 0

        # Sort according to arrival time
        processes = sorted(
            processes,
            key=lambda process: process.arrival_time
        )

        ready_queue = deque()

        current_time = 0
        next_process_index = 0
        completed_processes = []

        while len(completed_processes) < len(processes):

            # Add newly arrived processes
            while (
                next_process_index < len(processes)
                and processes[next_process_index].arrival_time <= current_time
            ):
                processes[next_process_index].state = "READY"
                ready_queue.append(processes[next_process_index])
                next_process_index += 1

            # If ready queue is empty, jump to next arrival
            if not ready_queue:

                if next_process_index < len(processes):
                    current_time = processes[next_process_index].arrival_time
                    continue

            process = ready_queue.popleft()

            process.state = "RUNNING"

            # First time the process gets CPU
            if process.start_time is None:

                process.start_time = current_time

                process.response_time = (
                    process.start_time - process.arrival_time
                )

            # CPU time given during this turn
            execution_time = min(
                self.time_quantum,
                process.remaining_time
            )

            current_time += execution_time

            process.remaining_time -= execution_time

            # Add processes that arrived during this execution
            while (
                next_process_index < len(processes)
                and processes[next_process_index].arrival_time <= current_time
            ):
                processes[next_process_index].state = "READY"
                ready_queue.append(processes[next_process_index])
                next_process_index += 1

            # Process finished
            if process.remaining_time == 0:

                process.completion_time = current_time

                process.state = "TERMINATED"

                process.turnaround_time = (
                    process.completion_time
                    - process.arrival_time
                )

                process.waiting_time = (
                    process.turnaround_time
                    - process.burst_time
                )

                completed_processes.append(process)

            # Process still has work
            else:

                process.state = "READY"

                ready_queue.append(process)

        return completed_processes