from abc import ABC, abstractmethod


class Scheduler(ABC):

    @abstractmethod
    def schedule(self, processes):
        pass


def get_scheduler(algorithm, time_quantum=None):
    """
    Return the appropriate scheduler based on the algorithm name.
    """

    algorithm = algorithm.upper()

    if algorithm == "FCFS":
        from .fcfs import FCFSScheduler
        return FCFSScheduler()

    elif algorithm == "SJF":
        from .sjf import SJFScheduler
        return SJFScheduler()

    elif algorithm == "PRIORITY":
        from .priority import PriorityScheduler
        return PriorityScheduler()

    elif algorithm == "ROUND_ROBIN":
        from .round_robin import RoundRobinScheduler

        if time_quantum is None:
            raise ValueError(
                "Time quantum is required for Round Robin."
            )

        return RoundRobinScheduler(time_quantum)

    else:
        raise ValueError(
            f"Unsupported scheduling algorithm: {algorithm}"
        )