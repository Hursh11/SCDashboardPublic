import os

print("Script is running")


def list_files(startpath):
    with open("ProjectStructure.md", "w") as f:
        for root, dirs, files in os.walk(startpath):
            level = root.replace(startpath, '').count(os.sep)
            indent = ' ' * 4 * (level)
            f.write(f"{indent}- {os.path.basename(root)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for file in files:
                f.write(f"{subindent}- {file}\n")

# Replace this with the root folder of your project
project_root = '/Users/owner/Desktop/SupplyChainPlanning'

list_files(project_root)
